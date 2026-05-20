// Controller: analyze — extracted from src/app/api/analyze/route.js

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../lib/rateLimit";
import { buildRepositoryAnalysis, maybeEnhanceAnalysisWithGroq, mergeAnalysisDetails } from "../lib/analysis";
import { createAnalysisRecord, deleteAnalysisRecord, findLatestAnalysisByRepo, getAnalysisRecord, listAnalysisRecords, serializeAnalysisRecord, updateAnalysisRecord } from "../lib/analysis-store";
import { fetchGitHubFileText, normalizeGitHubRepoUrl } from "../lib/github";
import { getCurrentSession, getGithubAccessToken, getSessionOwner } from "../lib/server-session";
import { createGitHubSnapshot } from "../lib/repository-snapshot";
import { buildCodeIntelligence } from "../lib/code-intel";
import { buildCodebaseIndex, buildTraversalArchitecture } from "../lib/codebase-index";
import { checkGate, logUsage } from "../lib/subscription-gate";

/**
 * Parses React component props from source code by matching common patterns.
 *
 * @param {string} source - The component source code
 * @param {string} componentName - The name of the component to find props for
 * @returns {string[]} Array of prop names (max 12)
 */
export function parsePropsFromSource(source, componentName) {
  const props = new Set();
  const matchers = [
    new RegExp(`function\\s+${componentName}\\s*\\(\\s*\\{([^}]*)\\}`, "m"),
    new RegExp(`const\\s+${componentName}\\s*=\\s*\\(\\s*\\{([^}]*)\\}`, "m"),
    /export default function\s+\w+\s*\(\s*\{([^}]*)\}/m,
  ];

  for (const matcher of matchers) {
    const match = source.match(matcher);
    if (match?.[1]) {
      match[1]
        .split(",")
        .map((item) => item.trim().replace(/[:?].*$/, "").replace(/=.*/, "").trim())
        .filter(Boolean)
        .forEach((prop) => props.add(prop));
    }
  }

  for (const dynamicMatch of source.matchAll(/\bprops\.([A-Za-z0-9_]+)/g)) {
    props.add(dynamicMatch[1]);
  }

  return [...props].slice(0, 12);
}

/**
 * Parses child component references from JSX source code.
 *
 * @param {string} source - The component source code
 * @returns {string[]} Array of child component names (max 10)
 */
export function parseChildComponents(source) {
  const children = new Set();
  for (const match of source.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)) {
    children.add(match[1]);
  }
  return [...children].slice(0, 10);
}

/**
 * Builds a short summary string for a component describing its characteristics.
 *
 * @param {string} source - The component source code
 * @param {string} componentName - The component name
 * @param {string} filePath - The file path of the component
 * @returns {string} Summary description
 */
export function buildComponentSummary(source, componentName, filePath) {
  const exported = source.includes(`export default ${componentName}`) || source.includes(`export default function ${componentName}`);
  const hasState = /\buseState\b|\buseReducer\b/.test(source);
  const hasEffects = /\buseEffect\b|\buseLayoutEffect\b/.test(source);
  const hints = [];

  if (exported) hints.push("default export");
  if (hasState) hints.push("local state");
  if (hasEffects) hints.push("side effects");

  return `${componentName} in ${filePath}${hints.length ? ` uses ${hints.join(" and ")}.` : "."}`;
}

/**
 * Enriches analysis with detailed component information fetched from GitHub.
 * Fetches source code for component files and builds usage maps.
 *
 * @param {object} repository - The repository snapshot object
 * @param {string} repoPath - The GitHub repo path (owner/repo)
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<object[]>} Array of enriched component objects
 */
export async function enrichGitHubComponents(repository, repoPath, accessToken) {
  const componentCandidates = repository.fileTree
    .filter((entry) => entry.type === "blob" && /(src\/components\/|components\/).+\.(jsx|tsx)$/.test(entry.path))
    .slice(0, 10);

  const usageCandidates = repository.fileTree
    .filter((entry) => entry.type === "blob" && /\.(jsx|tsx|js|ts)$/.test(entry.path))
    .slice(0, 60);

  const usageTexts = await Promise.all(
    usageCandidates.map(async (entry) => ({
      path: entry.path,
      text: await fetchGitHubFileText(repoPath, repository.defaultBranch, entry.path, accessToken),
    })),
  );

  const components = await Promise.all(
    componentCandidates.map(async (entry) => {
      const source = await fetchGitHubFileText(repoPath, repository.defaultBranch, entry.path, accessToken);
      if (!source) {
        return null;
      }

      const name = entry.path.split("/").pop().replace(/\.(jsx|tsx)$/, "");
      const usedIn = usageTexts
        .filter((candidate) => candidate.path !== entry.path && candidate.text && (candidate.text.includes(`<${name}`) || candidate.text.includes(`import ${name}`)))
        .map((candidate) => candidate.path)
        .slice(0, 8);

      return {
        name,
        file: entry.path,
        props: parsePropsFromSource(source, name),
        children: parseChildComponents(source).filter((child) => child !== name),
        usedIn,
        summary: buildComponentSummary(source, name, entry.path),
      };
    }),
  );

  return components.filter(Boolean);
}

/**
 * Builds a flow map combining base flows with component and endpoint information.
 *
 * @param {object[]} baseFlows - Existing flow paths
 * @param {object[]} components - Enriched component objects
 * @param {object[]} endpoints - API endpoint objects
 * @returns {object[]} Enhanced flow map
 */
export function buildFlowMap(baseFlows, components, endpoints) {
  const enhanced = [...(baseFlows || [])];

  if (components?.length) {
    enhanced.push({
      name: "Component interaction map",
      steps: components.slice(0, 5).map((component) => {
        const usage = component.usedIn?.[0] ? ` consumed by ${component.usedIn[0]}` : " awaiting usage inference";
        return `${component.name} -> ${component.children?.[0] || "leaf UI node"}${usage}`;
      }),
    });
  }

  if (endpoints?.length) {
    enhanced.push({
      name: "API surface map",
      steps: endpoints.slice(0, 5).map((endpoint) => `${endpoint.method} ${endpoint.path} -> ${endpoint.file}`),
    });
  }

  return enhanced;
}

/**
 * Merges base API endpoints with code-intelligence-derived endpoints.
 *
 * @param {object[]} baseEndpoints - Existing endpoint list
 * @param {object[]} codeIntelFiles - Files from code intelligence with endpoint data
 * @returns {object[]} Merged endpoints (max 100)
 */
export function mergeApiEndpoints(baseEndpoints = [], codeIntelFiles = []) {
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

/**
 * Validates that the given owner has read access to the analysis record.
 * Throws an error with status 403 if access is denied.
 *
 * @param {object} analysis - The analysis record
 * @param {string} ownerEmail - The email of the requesting user
 * @throws {Error} If access is denied
 */
export function ensureReadAccess(analysis, ownerEmail) {
  if (analysis?.owner_email && analysis.owner_email !== ownerEmail) {
    const error = new Error("You do not have access to this analysis.");
    error.status = 403;
    throw error;
  }
}

/**
 * Formats a route error into a user-friendly message.
 * Handles specific cases like DNS resolution failures.
 *
 * @param {Error} error - The error object
 * @returns {string} Formatted error message
 */
export function formatRouteError(error) {
  const details = typeof error?.details === "string" ? error.details : "";
  const raw = [error?.message, details].filter(Boolean).join("\n");

  if (/getaddrinfo ENOTFOUND/i.test(raw)) {
    return `Service temporarily unavailable. Please try again in a moment.`;
  }

  // Never expose internal error details to the client
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|socket hang up/i.test(raw)) {
    return "Service temporarily unavailable. Please try again.";
  }

  return error?.message || "Analysis failed";
}

/**
 * Handles the POST request for repository analysis.
 * Validates input, checks rate limits and subscription gates, fetches repository data,
 * builds analysis with code intelligence, and persists the result.
 *
 * @param {Request} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} JSON response with analysis result or error
 */
export async function handleAnalyzePost(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() || headersList.get("x-real-ip") || "unknown";

  // Validate Content-Type before trying to parse JSON
  const contentType = headersList.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  // Session first so we can key rate limit by user when authed
  const session = await getCurrentSession();
  const ownerEmail = await getSessionOwner(session);
  const accessToken = await getGithubAccessToken(session);

  const rlKey = rateLimitKey("analyze", ip, ownerEmail);
  const limit = await rateLimit(rlKey, 10, 60_000);
  if (!limit.success) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(limit.resetIn / 1000)}s.`, resetIn: limit.resetIn },
      { status: 429 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { repoUrl } = body;
  if (!repoUrl || typeof repoUrl !== "string") {
    return NextResponse.json({ error: "repoUrl is required and must be a string" }, { status: 400 });
  }
  if (repoUrl.length > 300) {
    return NextResponse.json({ error: "repoUrl is too long" }, { status: 400 });
  }

  const gateResult = await checkGate(session.userId, "repo_analyze");
  if (!gateResult.allowed) {
    return NextResponse.json({ error: gateResult.reason, code: gateResult.code }, { status: 403 });
  }

  let normalized;
  try {
    normalized = normalizeGitHubRepoUrl(repoUrl);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const forceReanalyze = body.force === true;

  if (forceReanalyze) {
    const reanalyzeGate = await checkGate(session.userId, "reanalyze");
    if (!reanalyzeGate.allowed) {
      return NextResponse.json({ error: reanalyzeGate.reason, code: reanalyzeGate.code }, { status: 403 });
    }
  }

  let analysis = null;
  try {
    if (!forceReanalyze) {
      // Check for existing pre-indexed analysis (for suggested/public repos)
      // If one exists and is completed, clone it for this user instead of re-analyzing
      const existing = await findLatestAnalysisByRepo(normalized.repoUrl, null).catch(() => null);
      if (existing && existing.status === 'COMPLETED' && existing.owner_email === null) {
        // Pre-indexed public analysis exists — clone it for this user
        console.log(`[analyze] Found pre-indexed analysis for ${normalized.repoPath}, cloning...`);
        const cloned = await createAnalysisRecord({
          repo_url: existing.repo_url,
          repo_name: existing.repo_name,
          status: "COMPLETED",
          source: existing.source || "github",
          owner_email: ownerEmail,
          summary: existing.summary,
          total_files: existing.total_files,
          total_lines: existing.total_lines,
          languages: existing.languages,
          file_tree: existing.file_tree,
          architecture: existing.architecture,
          results: existing.results,
          is_private: false,
        });

        logUsage(session.userId, "repo_analyze", {
          repo_url: normalized.repoUrl,
          repo_name: existing.repo_name,
          total_files: existing.total_files,
          pre_indexed: true,
        }).catch(() => {});

        return NextResponse.json(cloned);
      }
    }

    // Dedup: check if there's already a PROCESSING analysis for this repo by this user (prevents double-click)
    const inProgress = await findLatestAnalysisByRepo(normalized.repoUrl, ownerEmail).catch(() => null);
    if (inProgress && inProgress.status === 'PROCESSING') {
      const ageMs = Date.now() - new Date(inProgress.created_at).getTime();
      if (ageMs < 120_000) { // Less than 2 minutes old — still processing
        console.log(`[analyze] Dedup: returning existing PROCESSING analysis ${inProgress.id}`);
        return NextResponse.json(inProgress);
      }
      // Older than 2 min and still PROCESSING — likely stale, delete and re-analyze
      await deleteAnalysisRecord(inProgress.id).catch(() => {});
    }

    analysis = await createAnalysisRecord({
      repo_url: normalized.repoUrl,
      repo_name: body.repoName || normalized.repo,
      status: "PROCESSING",
      source: "github",
      owner_email: ownerEmail,
    });

    console.log(`[analyze] Starting analysis for ${normalized.repoPath} (id: ${analysis.id})`);

    // Overall timeout protection — Vercel has 60s limit, we use 50s to leave room for DB save
    const ANALYSIS_TIMEOUT = 50_000;
    const startTime = Date.now();
    const isTimedOut = () => Date.now() - startTime > ANALYSIS_TIMEOUT;

    const previous = await findLatestAnalysisByRepo(normalized.repoUrl, ownerEmail);

    console.log(`[analyze] Fetching repository snapshot...`);
    const snapshot = await createGitHubSnapshot(normalized.repoPath, accessToken);
    const fileCount = snapshot.fileTree.length;
    console.log(`[analyze] Snapshot complete: ${fileCount} files`);

    // Hard limit — repos with 5000+ source files (after filtering) are too large for real-time analysis
    const sourceFiles = snapshot.fileTree.filter(f => {
      const p = f.path.toLowerCase();
      return f.type === 'blob' && !p.includes('node_modules/') && !p.includes('.git/') &&
             !p.includes('vendor/') && !p.includes('dist/') && !p.includes('build/') &&
             !p.includes('.next/') && !p.includes('__pycache__/') && !p.includes('.cache/');
    });
    
    if (sourceFiles.length > 5000) {
      // Clean up the processing record
      await deleteAnalysisRecord(analysis.id).catch(() => {});
      return NextResponse.json({
        error: "large_codebase",
        message: `This codebase has ${sourceFiles.length.toLocaleString()} source files — it's too large for real-time analysis right now. We're building support for large-scale codebases. Stay tuned.`,
        fileCount: sourceFiles.length,
      }, { status: 422 });
    }

    // Large repo detection — adjust processing based on size
    const isLargeRepo = sourceFiles.length > 1000;
    const isHugeRepo = sourceFiles.length > 3000;
    const fileTreeLimit = isHugeRepo ? 3000 : isLargeRepo ? 4000 : 5000;

    // Filter out noise from file tree (node_modules, build outputs, etc.)
    const filteredTree = snapshot.fileTree.filter(f => {
      const p = f.path.toLowerCase();
      return !p.includes('node_modules/') && !p.includes('.git/') &&
             !p.includes('vendor/') && !p.includes('dist/') &&
             !p.includes('build/') && !p.includes('.next/') &&
             !p.includes('__pycache__/') && !p.includes('.cache/');
    }).slice(0, fileTreeLimit);

    let result = buildRepositoryAnalysis({
      repoUrl: snapshot.repoUrl,
      repoName: body.repoName || snapshot.repoName || normalized.repo,
      fileTree: filteredTree,
      languages: snapshot.languages,
      repoData: snapshot.repoData,
      source: "github",
    });

    // For huge repos: save a partial result immediately so user sees something
    if (isHugeRepo) {
      await updateAnalysisRecord(analysis.id, {
        status: "PROCESSING",
        repo_name: result.repoName,
        summary: `Analyzing ${fileCount} files... This is a large repository.`,
        total_files: fileCount,
        languages: result.languages,
        file_tree: filteredTree,
        architecture: result.architecture,
        updated_at: new Date().toISOString(),
      }).catch(() => {});
      console.log(`[analyze] Partial save for huge repo (${fileCount} files)`);
    }

    // For large repos (>500 files), skip component enrichment to avoid timeout
    let detailedComponents = [];
    if (fileCount <= 500 && !isTimedOut()) {
      console.log(`[analyze] Enriching components...`);
      detailedComponents = await enrichGitHubComponents(snapshot, normalized.repoPath, accessToken);
    } else {
      console.log(`[analyze] Skipping component enrichment (${fileCount} files, timeout: ${isTimedOut()})`);
    }

    if (isTimedOut()) {
      console.log(`[analyze] Timeout reached after component enrichment, saving partial results...`);
    }

    console.log(`[analyze] Building code intelligence...`);
    // For huge repos, limit code-intel to most important files (prioritize source over tests/docs)
    const codeIntelLimit = isHugeRepo ? 1000 : isLargeRepo ? 1500 : filteredTree.length;
    const prioritizedTree = filteredTree
      .filter(f => f.type === 'blob')
      .sort((a, b) => {
        // Prioritize: entry points > src > lib > components > everything else > tests
        const score = (p) => {
          if (/^(index|main|app|server)\./i.test(p.split('/').pop())) return 0;
          if (/src\//i.test(p) && !/test|spec|__test/i.test(p)) return 1;
          if (/lib\//i.test(p)) return 2;
          if (/component/i.test(p)) return 3;
          if (/test|spec|__test/i.test(p)) return 9;
          return 5;
        };
        return score(a.path) - score(b.path);
      })
      .slice(0, codeIntelLimit);
    
    const codeIntelSnapshot = { ...snapshot, fileTree: prioritizedTree };
    const codeIntel = buildCodeIntelligence(codeIntelSnapshot, previous);
    console.log(`[analyze] Code intel complete: ${codeIntel.files.length} files indexed (limit: ${codeIntelLimit})`);

    console.log(`[analyze] Building codebase index...`);
    let codebaseIndex, persistedCodebaseIndex, mergedEndpoints;
    
    if (!isTimedOut()) {
      codebaseIndex = buildCodebaseIndex({
        fileTree: filteredTree,
        files: codeIntel.files,
        symbolIndex: codeIntel.symbolIndex,
        dependencyGraph: codeIntel.dependencyGraph,
        callGraph: codeIntel.callGraph,
      });
      persistedCodebaseIndex = { ...codebaseIndex };
      delete persistedCodebaseIndex.__runtime;
      mergedEndpoints = mergeApiEndpoints(result.architecture.apiEndpoints, codeIntel.files);
    } else {
      console.log(`[analyze] Timeout — skipping codebase index, using basic results`);
      codebaseIndex = { dependencyGraph: {}, fileCallGraph: {} };
      persistedCodebaseIndex = codebaseIndex;
      mergedEndpoints = result.architecture.apiEndpoints || [];
    }
    result = mergeAnalysisDetails(result, {
      components: detailedComponents.length ? detailedComponents : result.architecture.components,
      flowPaths: buildFlowMap(result.architecture.flowPaths, detailedComponents, mergedEndpoints),
      apiEndpoints: mergedEndpoints,
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
    console.log(`[analyze] Enhancing with AI...`);
    if (!isTimedOut()) {
      result = await Promise.race([
        maybeEnhanceAnalysisWithGroq(result, { snapshot: codeIntelSnapshot, codeIntel }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), Math.min(30000, ANALYSIS_TIMEOUT - (Date.now() - startTime) - 5000))),
      ]).catch((err) => {
        if (err.message === 'AI_TIMEOUT') {
          console.log(`[analyze] AI enhancement timed out, continuing without it`);
        } else {
          console.warn(`[analyze] AI enhancement failed:`, err.message);
        }
        return result;
      });
    } else {
      console.log(`[analyze] Skipping AI enhancement due to timeout`);
    }

    console.log(`[analyze] Saving results...`);

    console.log(`[analyze] Saving results...`);
    const updated = await updateAnalysisRecord(analysis.id, {
      status: "COMPLETED",
      repo_url: result.repoUrl,
      repo_name: result.repoName,
      summary: result.summary,
      total_files: result.totalFiles,
      total_lines: result.totalLines,
      languages: result.languages,
      file_tree: result.fileTree,
      architecture: result.architecture,
      results: result.results,
      is_private: result.isPrivate,
      error_message: null,
      updated_at: new Date().toISOString(),
    });

    logUsage(session.userId, "repo_analyze", {
      repo_url: result.repoUrl,
      repo_name: result.repoName,
      total_files: result.totalFiles,
    }).catch(() => {});

    if (forceReanalyze) {
      logUsage(session.userId, "reanalyze", { repo_url: result.repoUrl }).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (analysis?.id) {
      await deleteAnalysisRecord(analysis.id).catch(() => {});
    }
    if (error.code === "AUTH_REQUIRED") {
      return NextResponse.json(
        { error: "private_repo_unauthorized", message: "This is a private repository. Connect your GitHub to continue.", requiresAuth: true, requiresGithub: true },
        { status: 403 },
      );
    }
    if (error.code === "TOKEN_INVALID") {
      return NextResponse.json(
        { error: "private_repo_unauthorized", message: "Your GitHub token is invalid or expired. Reconnect to continue.", requiresAuth: true, requiresGithub: true },
        { status: 403 },
      );
    }
    Sentry.captureException(error, {
      level: "error",
      tags: { source: "analysis", route: "analyze" },
      extra: { repoUrl: body?.repoUrl, ownerEmail },
    });
    console.error("[analyze] error:", error);
    return NextResponse.json(
      { error: formatRouteError(error) },
      { status: error?.status || 500 },
    );
  }
}

/**
 * Handles the GET request for fetching analysis records.
 * Returns a single record by ID or lists all records for the authenticated user.
 *
 * @param {Request} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} JSON response with analysis record(s) or error
 */
export async function handleAnalyzeGet(request) {
  const id = new URL(request.url).searchParams.get("id");
  try {
    const session = await getCurrentSession();
    const ownerEmail = await getSessionOwner(session);

    if (id) {
      const record = await getAnalysisRecord(id);
      ensureReadAccess(record, ownerEmail);
      return NextResponse.json(record);
    }

    const records = await listAnalysisRecords(ownerEmail);
    return NextResponse.json(records.map(serializeAnalysisRecord));
  } catch (error) {
    if (error.status !== 403 && error.status !== 404) {
      Sentry.captureException(error, { tags: { route: "analyze-get" }, extra: { id } });
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
