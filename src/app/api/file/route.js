import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../../../lib/rateLimit";
import { getAnalysisRecord } from "../../../lib/analysis-store";
import { fetchGitHubFileText, normalizeGitHubRepoUrl } from "../../../lib/github";
import { isAIConfigured } from "../../../lib/env";
import { buildReasoningRequest, getAIModel, aiFetch } from "../../../lib/ai";
import { getCurrentSession, getGithubAccessToken, getSessionOwner } from "../../../lib/server-session";

function ensureReadAccess(analysis, ownerEmail) {
  if (analysis?.owner_email && analysis.owner_email !== ownerEmail) {
    const error = new Error("You do not have access to this analysis.");
    error.status = 403;
    throw error;
  }
}

async function resolveFileCode({ analysis, indexedFile, filePath, accessToken }) {
  if (analysis.source === "github" && analysis.repo_url) {
    try {
      const normalized = normalizeGitHubRepoUrl(analysis.repo_url);
      const ref = analysis?.results?.incremental?.revision || "HEAD";
      const code = await fetchGitHubFileText(normalized.repoPath, ref, filePath, accessToken);
      if (code != null) return { code, source: "github-live", truncated: false };
    } catch {
      // fall through to cache
    }
  }
  return { code: indexedFile.code || "", truncated: Boolean(indexedFile.truncated), source: "analysis-cache" };
}

function buildLocalFileInsight(indexedFile) {
  const facts = [
    `Path: ${indexedFile.path}`,
    `Type: ${indexedFile.summary}`,
    indexedFile.language          ? `Language: ${indexedFile.language}` : null,
    indexedFile.functions?.length ? `Functions: ${indexedFile.functions.map(i => i.name).slice(0, 8).join(", ")}` : null,
    indexedFile.classes?.length   ? `Classes: ${indexedFile.classes.map(i => i.name).slice(0, 6).join(", ")}` : null,
    indexedFile.selectors?.length ? `Selectors: ${indexedFile.selectors.slice(0, 8).join(", ")}` : null,
    indexedFile.topLevelKeys?.length ? `Top-level keys: ${indexedFile.topLevelKeys.slice(0, 8).join(", ")}` : null,
    indexedFile.headings?.length  ? `Headings: ${indexedFile.headings.slice(0, 8).join(", ")}` : null,
    indexedFile.imports?.length   ? `Imports: ${indexedFile.imports.slice(0, 8).join(", ")}` : null,
  ].filter(Boolean);
  return `### File Summary\n${indexedFile.why}\n\n### What This File Contains\n- ${facts.join("\n- ")}`;
}

async function getIpAndSession(headersList) {
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
    || headersList.get("x-real-ip")
    || "unknown";
  const session = await getCurrentSession();
  return { ip, session };
}

export async function GET(request) {
  const headersList = await headers();
  const { ip, session } = await getIpAndSession(headersList);
  const ownerEmail  = await getSessionOwner(session);
  const accessToken = await getGithubAccessToken(session);

  const rlKey = rateLimitKey("file-get", ip, ownerEmail);
  const limit = await rateLimit(rlKey, 60, 60_000);
  if (!limit.success) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get("id");
    const filePath   = searchParams.get("path");

    if (!analysisId || !filePath) {
      return NextResponse.json({ error: "id and path are required." }, { status: 400 });
    }

    const analysis = await getAnalysisRecord(analysisId);
    if (!analysis) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    ensureReadAccess(analysis, ownerEmail);

    const indexedFile = (analysis?.results?.files || []).find(f => f.path === filePath);
    if (!indexedFile) return NextResponse.json({ error: "File not found in this analysis." }, { status: 404 });

    const resolved = await resolveFileCode({ analysis, indexedFile, filePath, accessToken });
    return NextResponse.json({ path: filePath, code: resolved.code, truncated: resolved.truncated, source: resolved.source });
  } catch (error) {
    if (error.status !== 403 && error.status !== 404) {
      Sentry.captureException(error, { tags: { route: "file-get" } });
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request) {
  const headersList = await headers();
  const ct = headersList.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const { ip, session } = await getIpAndSession(headersList);
  const ownerEmail  = await getSessionOwner(session);
  const accessToken = await getGithubAccessToken(session);

  const rlKey = rateLimitKey("file-insight", ip, ownerEmail);
  const limit = await rateLimit(rlKey, 20, 60_000);
  if (!limit.success) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { analysisId, filePath } = body;
  if (!analysisId || !filePath) {
    return NextResponse.json({ error: "analysisId and filePath are required." }, { status: 400 });
  }

  try {
    const analysis = await getAnalysisRecord(analysisId);
    if (!analysis) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    ensureReadAccess(analysis, ownerEmail);

    const indexedFile = (analysis?.results?.files || []).find(f => f.path === filePath);
    if (!indexedFile) return NextResponse.json({ error: "File not found in this analysis." }, { status: 404 });

    const resolved = await resolveFileCode({ analysis, indexedFile, filePath, accessToken });
    let response = buildLocalFileInsight(indexedFile);

    if (isAIConfigured()) {
      const aiRes = await aiFetch(buildReasoningRequest({
          maxCompletionTokens: 1400,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: `You are analyzing a single file. Stay grounded in the file content and metadata only. Use markdown with short headings and bullet points. Tailor the explanation to the file type. Model: ${getAIModel()}`,
            },
            {
              role: "user",
              content: JSON.stringify({
                repo: analysis?.repo_name,
                file: {
                  path: indexedFile.path,
                  summary: indexedFile.summary,
                  why: indexedFile.why,
                  language: indexedFile.language,
                  fileKind: indexedFile.fileKind,
                  functions:        indexedFile.functions?.map(i => i.name) || [],
                  classes:          indexedFile.classes?.map(i => i.name) || [],
                  methods:          indexedFile.methods?.map(i => i.name) || [],
                  imports:          indexedFile.imports || [],
                  selectors:        indexedFile.selectors || [],
                  customProperties: indexedFile.customProperties || [],
                  animations:       indexedFile.animations || [],
                  topLevelKeys:     indexedFile.topLevelKeys || [],
                  headings:         indexedFile.headings || [],
                  tags:             indexedFile.tags || [],
                  code: resolved.code.slice(0, 20000),
                },
              }),
            },
          ],
        }),
      );

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        response = aiData.choices?.[0]?.message?.content || response;
      }
    }

    return NextResponse.json({ response });
  } catch (error) {
    if (error.status !== 403 && error.status !== 404) {
      Sentry.captureException(error, {
        tags: { route: "file-insight" },
        extra: { analysisId: body?.analysisId, filePath: body?.filePath },
      });
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
