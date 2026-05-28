import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../lib/rateLimit";
import { buildRepositoryAnalysis, maybeEnhanceAnalysisWithGroq, mergeAnalysisDetails } from "../lib/analysis";
import { createAnalysisRecord, findLatestAnalysisByRepo, updateAnalysisRecord } from "../lib/analysis-store";
import { getCurrentSession, getSessionOwner } from "../lib/server-session";
import { createFolderUploadSnapshot, createUploadSnapshot, scopeSnapshotToPaths } from "../lib/repository-snapshot";
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

      snapshot = await createFolderUploadSnapshot(folderFiles, String(folderName));

      if (!snapshot.fileTree || snapshot.fileTree.length === 0) {
        return NextResponse.json({ error: "No valid source files found in the upload." }, { status: 400 });
      }
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

    const isLargeUpload = snapshot.fileTree.length > 1500;
    const isHugeUpload = snapshot.fileTree.length > 3000;
    const codeIntelLimit = isHugeUpload ? 800 : isLargeUpload ? 1500 : snapshot.fileTree.length;
    const prioritizedTree = snapshot.fileTree
      .filter((entry) => entry.type === "blob")
      .sort((a, b) => {
        const score = (path) => {
          const name = path.split("/").pop() || "";
          if (/^(index|main|app|server)\./i.test(name)) return 0;
          if (/src\//i.test(path) && !/test|spec|__test/i.test(path)) return 1;
          if (/lib\//i.test(path)) return 2;
          if (/component/i.test(path)) return 3;
          if (/test|spec|__test/i.test(path)) return 9;
          return 5;
        };
        return score(a.path) - score(b.path);
      })
      .slice(0, codeIntelLimit);
    const codeIntelSnapshot = scopeSnapshotToPaths(snapshot, prioritizedTree);

    let result = buildRepositoryAnalysis({
      repoUrl: snapshot.repoUrl,
      repoName,
      fileTree: snapshot.fileTree.slice(0, 5000),
      languages: snapshot.languages,
      repoData: {},
      source: "upload",
    });
    const codeIntel = buildCodeIntelligence(codeIntelSnapshot, previous);
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
      indexCoverage: {
        totalSourceFiles: snapshot.fileTree.length,
        totalTextFiles: snapshot.textFiles.length,
        indexedTextFiles: codeIntel.files.length,
        indexedFileBudget: codeIntelLimit,
        partialIndexing: snapshot.textFiles.length > codeIntel.files.length,
        liveFetchEnabled: false,
      },
    });
    if (snapshot.textFiles.length > codeIntel.files.length) {
      result.summary = `${result.summary} Deep index coverage is focused: analyzed ${codeIntel.files.length} of ${snapshot.textFiles.length} text files.`;
    }
    result = await maybeEnhanceAnalysisWithGroq(result, { snapshot: codeIntelSnapshot, codeIntel });

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
