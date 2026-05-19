import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../lib/rateLimit";
import { buildRepositoryAnalysis, maybeEnhanceAnalysisWithGroq, mergeAnalysisDetails } from "../lib/analysis";
import { createAnalysisRecord, findLatestAnalysisByRepo, updateAnalysisRecord } from "../lib/analysis-store";
import { getCurrentSession, getSessionOwner } from "../lib/server-session";
import { createUploadSnapshot } from "../lib/repository-snapshot";
import { buildCodeIntelligence } from "../lib/code-intel";
import { buildCodebaseIndex, buildTraversalArchitecture } from "../lib/codebase-index";

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
    return `Service temporarily unavailable. Please try again in a moment.`;
  }

  return error?.message || "Upload failed";
}

export async function handleUploadPost(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  const session = await getCurrentSession();
  const ownerEmail = await getSessionOwner(session);

  const rlKey = rateLimitKey("upload", ip, ownerEmail);
  const limit = await rateLimit(rlKey, 5, 60_000);
  if (!limit.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const formData = await request.formData();

    // Check if this is a folder upload (multiple files) or a zip upload
    const folderFiles = formData.getAll("files");
    const folderName = formData.get("folderName");
    const singleFile = formData.get("file");

    let snapshot;

    if (folderFiles.length > 0 && folderName) {
      // Folder upload — multiple files with relative paths
      if (folderFiles.length > 10000) {
        return NextResponse.json({ error: "Too many files (max 10,000). Try a smaller project." }, { status: 400 });
      }

      let totalSize = 0;
      for (const f of folderFiles) { totalSize += f.size; }
      if (totalSize > 50 * 1024 * 1024) {
        return NextResponse.json({ error: "Upload too large (max 50MB total)" }, { status: 400 });
      }

      // Safety: validate paths — no traversal, no dangerous files
      const BLOCKED_PATTERNS = /node_modules\/|\.git\/|\.env$|\.ssh|\.aws|id_rsa|\.pem$|\.key$/i;
      const BLOCKED_EXTENSIONS = /\.(exe|dll|so|dylib|bin|dmg|iso|msi|bat|cmd|ps1)$/i;

      const fileTree = [];
      for (const f of folderFiles) {
        const path = f.name;
        if (!path || path.includes('..') || path.startsWith('/')) continue;
        if (BLOCKED_PATTERNS.test(path)) continue;
        if (BLOCKED_EXTENSIONS.test(path)) continue;
        if (f.size > 5 * 1024 * 1024) continue;
        fileTree.push({ path, type: 'blob', size: f.size });
      }

      if (fileTree.length === 0) {
        return NextResponse.json({ error: "No valid source files found in the upload." }, { status: 400 });
      }

      const languages = {};
      for (const entry of fileTree) {
        const ext = entry.path.split('.').pop()?.toLowerCase();
        if (ext) languages[ext] = (languages[ext] || 0) + 1;
      }

      snapshot = {
        repoUrl: `upload://${folderName}`,
        repoName: String(folderName).slice(0, 100),
        fileTree,
        languages,
        repoData: {},
        defaultBranch: 'main',
      };
    } else if (singleFile) {
      if (!singleFile.name.endsWith(".zip")) return NextResponse.json({ error: "Only .zip files or folders supported" }, { status: 400 });
      if (singleFile.size > 50 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
      if (/[\/\\]/.test(singleFile.name) || singleFile.name.includes('..')) {
        return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
      }
      snapshot = await createUploadSnapshot(singleFile);
    } else {
      return NextResponse.json({ error: "No file or folder provided" }, { status: 400 });
    }

    // Safety: limit file count to prevent abuse
    if (snapshot.fileTree && snapshot.fileTree.length > 10000) {
      return NextResponse.json({ error: "This codebase is too large (max 10,000 files). Try a smaller project." }, { status: 400 });
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
