import { NextResponse } from "next/server";
import { getAnalysisRecord } from "../../../lib/analysis-store";
import { fetchGitHubFileText, normalizeGitHubRepoUrl } from "../../../lib/github";
import { isGroqConfigured } from "../../../lib/env";
import { buildGroqReasoningRequest, getGroqApiUrl, getGroqDefaultHeaders, getGroqModel } from "../../../lib/groq";
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
    const normalized = normalizeGitHubRepoUrl(analysis.repo_url);
    const ref = analysis?.results?.incremental?.revision || "HEAD";
    const code = await fetchGitHubFileText(normalized.repoPath, ref, filePath, accessToken);
    if (code != null) {
      return { code, source: "github-live", truncated: false };
    }
  }

  return {
    code: indexedFile.code || "",
    truncated: Boolean(indexedFile.truncated),
    source: "analysis-cache",
  };
}

function buildLocalFileInsight(indexedFile) {
  const facts = [
    `Path: ${indexedFile.path}`,
    `Type: ${indexedFile.summary}`,
    indexedFile.language ? `Language: ${indexedFile.language}` : null,
    indexedFile.functions?.length ? `Functions: ${indexedFile.functions.map((item) => item.name).slice(0, 8).join(", ")}` : null,
    indexedFile.classes?.length ? `Classes: ${indexedFile.classes.map((item) => item.name).slice(0, 6).join(", ")}` : null,
    indexedFile.selectors?.length ? `Selectors: ${indexedFile.selectors.slice(0, 8).join(", ")}` : null,
    indexedFile.customProperties?.length ? `Custom properties: ${indexedFile.customProperties.slice(0, 8).join(", ")}` : null,
    indexedFile.topLevelKeys?.length ? `Top-level keys: ${indexedFile.topLevelKeys.slice(0, 8).join(", ")}` : null,
    indexedFile.headings?.length ? `Headings: ${indexedFile.headings.slice(0, 8).join(", ")}` : null,
    indexedFile.tags?.length ? `HTML tags: ${indexedFile.tags.slice(0, 8).join(", ")}` : null,
    indexedFile.imports?.length ? `Imports: ${indexedFile.imports.slice(0, 8).join(", ")}` : null,
  ].filter(Boolean);

  return `### File Summary\n${indexedFile.why}\n\n### What This File Contains\n- ${facts.join("\n- ")}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get("id");
    const filePath = searchParams.get("path");

    if (!analysisId || !filePath) {
      return NextResponse.json({ error: "Analysis id and file path are required." }, { status: 400 });
    }

    const session = await getCurrentSession();
    const ownerEmail = getSessionOwner(session);
    const accessToken = getGithubAccessToken(session);
    const analysis = await getAnalysisRecord(analysisId);
    ensureReadAccess(analysis, ownerEmail);

    const indexedFile = (analysis?.results?.files || []).find((file) => file.path === filePath);
    if (!indexedFile) {
      return NextResponse.json({ error: "File not found in this analysis." }, { status: 404 });
    }

    const resolved = await resolveFileCode({ analysis, indexedFile, filePath, accessToken });
    return NextResponse.json({
      path: filePath,
      code: resolved.code,
      truncated: resolved.truncated,
      source: resolved.source,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request) {
  try {
    const { analysisId, filePath, eli5 = false } = await request.json();

    if (!analysisId || !filePath) {
      return NextResponse.json({ error: "Analysis id and file path are required." }, { status: 400 });
    }

    const session = await getCurrentSession();
    const ownerEmail = getSessionOwner(session);
    const accessToken = getGithubAccessToken(session);
    const analysis = await getAnalysisRecord(analysisId);
    ensureReadAccess(analysis, ownerEmail);

    const indexedFile = (analysis?.results?.files || []).find((file) => file.path === filePath);
    if (!indexedFile) {
      return NextResponse.json({ error: "File not found in this analysis." }, { status: 404 });
    }

    const resolved = await resolveFileCode({ analysis, indexedFile, filePath, accessToken });
    let response = buildLocalFileInsight(indexedFile);

    if (isGroqConfigured()) {
      const groqRes = await fetch(getGroqApiUrl(), {
        method: "POST",
        headers: getGroqDefaultHeaders(),
        body: JSON.stringify(buildGroqReasoningRequest({
          maxCompletionTokens: 1400,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: `You are analyzing a single file, not the whole repository. Stay grounded in the file content and metadata only. Use markdown with short headings and bullet points. Tailor the explanation to the file type. For CSS, talk about selectors, variables, and layout intent. For config/data files, explain keys and runtime purpose. For source files, explain functions/classes and ownership. Model: ${getGroqModel()}`,
            },
            {
              role: "user",
              content: JSON.stringify({
                mode: eli5 ? "eli5" : "technical",
                repo: analysis?.repo_name,
                file: {
                  path: indexedFile.path,
                  summary: indexedFile.summary,
                  why: indexedFile.why,
                  language: indexedFile.language,
                  fileKind: indexedFile.fileKind,
                  functions: indexedFile.functions?.map((item) => item.name) || [],
                  classes: indexedFile.classes?.map((item) => item.name) || [],
                  methods: indexedFile.methods?.map((item) => item.name) || [],
                  imports: indexedFile.imports || [],
                  selectors: indexedFile.selectors || [],
                  customProperties: indexedFile.customProperties || [],
                  animations: indexedFile.animations || [],
                  topLevelKeys: indexedFile.topLevelKeys || [],
                  headings: indexedFile.headings || [],
                  tags: indexedFile.tags || [],
                  code: resolved.code.slice(0, 20000),
                },
              }),
            },
          ],
        })),
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        response = groqData.choices?.[0]?.message?.content || response;
      }
    }

    return NextResponse.json({ response });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
