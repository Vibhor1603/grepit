import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../../../lib/rateLimit";
import { buildRepositoryAnalysis, maybeEnhanceAnalysisWithGroq, mergeAnalysisDetails } from "../../../lib/analysis";
import { createAnalysisRecord, findLatestAnalysisByRepo, updateAnalysisRecord } from "../../../lib/analysis-store";
import { getCurrentSession, getSessionOwner } from "../../../lib/server-session";
import { createUploadSnapshot } from "../../../lib/repository-snapshot";
import { buildCodeIntelligence } from "../../../lib/code-intel";
import { buildCodebaseIndex, buildTraversalArchitecture } from "../../../lib/codebase-index";

function mergeApiEndpoints(baseEndpoints = [], codeIntelFiles = []) {
  const merged = [...baseEndpoints];
  for (const file of codeIntelFiles) {
    for (const endpoint of file.endpoints || []) {
      merged.push({
        ...endpoint,
        requestSchema: file.schemas?.request || [],
        responseSchema: file.schemas?.response || [],
      });
    }
  }
  return merged.slice(0, 100);
}

function formatRouteError(error) {
  const details = typeof error?.details === "string" ? error.details : "";
  const raw = [error?.message, details].filter(Boolean).join("\n");

  if (/getaddrinfo ENOTFOUND/i.test(raw)) {
    const host = raw.match(/ENOTFOUND\s+([^\s)]+)/i)?.[1] || "your Postgres host";
    return `Unable to reach the Postgres host (${host}). Check DATABASE_URL, DNS, or your network connection.`;
  }

  return error?.message || "Upload failed";
}

export async function POST(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  const session = await getCurrentSession();
  const ownerEmail = await getSessionOwner(session);

  const rlKey = rateLimitKey("upload", ip, ownerEmail);
  const limit = rateLimit(rlKey, 5, 60_000);
  if (!limit.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.name.endsWith(".zip")) return NextResponse.json({ error: "Only .zip files supported" }, { status: 400 });
    if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });

    // Validate file name — no path traversal
    if (/[\/\\]/.test(file.name) || file.name.includes('..')) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const snapshot = await createUploadSnapshot(file);

    // Safety: limit file count to prevent abuse
    if (snapshot.fileTree && snapshot.fileTree.length > 10000) {
      return NextResponse.json({ error: "Repository too large (max 10,000 files). Try a smaller project." }, { status: 400 });
    }
    const repoName = snapshot.repoName;
    const previous = await findLatestAnalysisByRepo(snapshot.repoUrl, ownerEmail);

    const analysis = await createAnalysisRecord({
      repo_url: snapshot.repoUrl,
      repo_name: repoName,
      source: "upload",
      status: "PROCESSING",
      owner_email: ownerEmail,
    });

    let result = buildRepositoryAnalysis({
      repoUrl: snapshot.repoUrl,
      repoName,
      fileTree: snapshot.fileTree.slice(0, 5000),
      languages: snapshot.languages,
      repoData: {},
      source: "upload",
    });
    const codeIntel = buildCodeIntelligence(snapshot, previous);
    const codebaseIndex = buildCodebaseIndex({
      fileTree: snapshot.fileTree.slice(0, 5000),
      files: codeIntel.files,
      symbolIndex: codeIntel.symbolIndex,
      dependencyGraph: codeIntel.dependencyGraph,
      callGraph: codeIntel.callGraph,
    });
    const persistedCodebaseIndex = { ...codebaseIndex };
    delete persistedCodebaseIndex.__runtime;
    result = mergeAnalysisDetails(result, {
      apiEndpoints: mergeApiEndpoints(result.architecture.apiEndpoints, codeIntel.files),
      symbolIndex: codeIntel.symbolIndex,
      files: codeIntel.files,
      rawDependencyGraph: codeIntel.dependencyGraph,
      dependencyGraph: codebaseIndex.dependencyGraph,
      callGraph: codeIntel.callGraph,
      fileCallGraph: codebaseIndex.fileCallGraph,
      codebaseIndex: persistedCodebaseIndex,
      queryArchitecture: buildTraversalArchitecture(persistedCodebaseIndex),
      testing: codeIntel.testing,
      reports: codeIntel.reports,
      quality: codeIntel.quality,
      security: codeIntel.security,
      performance: codeIntel.performance,
      incremental: codeIntel.incremental,
    });
    result = await maybeEnhanceAnalysisWithGroq(result, { snapshot, codeIntel });

    const updated = await updateAnalysisRecord(analysis.id, {
      status: "COMPLETED",
      summary: result.summary,
      total_files: result.totalFiles,
      total_lines: result.totalLines,
      languages: result.languages,
      file_tree: result.fileTree,
      architecture: result.architecture,
      results: result.results,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json(updated);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "upload" },
      extra: { ownerEmail },
    });
    console.error("Upload error:", error);
    return NextResponse.json({ error: formatRouteError(error) }, { status: 500 });
  }
}
