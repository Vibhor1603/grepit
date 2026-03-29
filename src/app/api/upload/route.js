import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit } from "../../../lib/rateLimit";
import { buildRepositoryAnalysis, maybeEnhanceAnalysisWithGroq, mergeAnalysisDetails } from "../../../lib/analysis";
import { createAnalysisRecord, findLatestAnalysisByRepo, updateAnalysisRecord } from "../../../lib/analysis-store";
import { getCurrentSession, getSessionOwner } from "../../../lib/server-session";
import { createUploadSnapshot } from "../../../lib/repository-snapshot";
import { buildCodeIntelligence } from "../../../lib/code-intel";

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

export async function POST(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  const limit = rateLimit(`upload:${ip}`, 5, 60000);
  if (!limit.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.name.endsWith(".zip")) return NextResponse.json({ error: "Only .zip files supported" }, { status: 400 });
    if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });

    const session = await getCurrentSession();
    const ownerEmail = getSessionOwner(session);
    const snapshot = await createUploadSnapshot(file);
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
    result = mergeAnalysisDetails(result, {
      apiEndpoints: mergeApiEndpoints(result.architecture.apiEndpoints, codeIntel.files),
      symbolIndex: codeIntel.symbolIndex,
      files: codeIntel.files,
      dependencyGraph: codeIntel.dependencyGraph,
      callGraph: codeIntel.callGraph,
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
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
