import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../../../lib/rateLimit";
import { buildRepositoryAnalysis, maybeEnhanceAnalysisWithGroq, mergeAnalysisDetails } from "../../../lib/analysis";
import { createAnalysisRecord, deleteAnalysisRecord, findLatestAnalysisByRepo, getAnalysisRecord, listAnalysisRecords, serializeAnalysisRecord, updateAnalysisRecord } from "../../../lib/analysis-store";
import { fetchGitHubFileText, normalizeGitHubRepoUrl } from "../../../lib/github";
import { getCurrentSession, getGithubAccessToken, getSessionOwner } from "../../../lib/server-session";
import { createGitHubSnapshot } from "../../../lib/repository-snapshot";
import { buildCodeIntelligence } from "../../../lib/code-intel";
import { buildCodebaseIndex, buildTraversalArchitecture } from "../../../lib/codebase-index";

function parsePropsFromSource(source, componentName) {
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

function parseChildComponents(source) {
  const children = new Set();
  for (const match of source.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)) {
    children.add(match[1]);
  }
  return [...children].slice(0, 10);
}

function buildComponentSummary(source, componentName, filePath) {
  const exported = source.includes(`export default ${componentName}`) || source.includes(`export default function ${componentName}`);
  const hasState = /\buseState\b|\buseReducer\b/.test(source);
  const hasEffects = /\buseEffect\b|\buseLayoutEffect\b/.test(source);
  const hints = [];

  if (exported) hints.push("default export");
  if (hasState) hints.push("local state");
  if (hasEffects) hints.push("side effects");

  return `${componentName} in ${filePath}${hints.length ? ` uses ${hints.join(" and ")}.` : "."}`;
}

async function enrichGitHubComponents(repository, repoPath, accessToken) {
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

function buildFlowMap(baseFlows, components, endpoints) {
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

function ensureReadAccess(analysis, ownerEmail) {
  if (analysis?.owner_email && analysis.owner_email !== ownerEmail) {
    const error = new Error("You do not have access to this analysis.");
    error.status = 403;
    throw error;
  }
}

function formatRouteError(error) {
  const details = typeof error?.details === "string" ? error.details : "";
  const raw = [error?.message, details].filter(Boolean).join("\n");

  if (/getaddrinfo ENOTFOUND/i.test(raw)) {
    const host = raw.match(/ENOTFOUND\s+([^\s)]+)/i)?.[1] || "your Postgres host";
    return `Unable to reach the Postgres host (${host}). Check DATABASE_URL, DNS, or your network connection.`;
  }

  return error?.message || "Analysis failed";
}

export async function POST(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() || headersList.get("x-real-ip") || "unknown";

  // Validate Content-Type before trying to parse JSON — this is the source of the TypeError
  const contentType = headersList.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  // Session first so we can key rate limit by user when authed
  const session = await getCurrentSession();
  const ownerEmail = getSessionOwner(session);
  const accessToken = getGithubAccessToken(session);

  const rlKey = rateLimitKey("analyze", ip, ownerEmail);
  const limit = rateLimit(rlKey, 10, 60_000);
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

  let normalized;
  try {
    normalized = normalizeGitHubRepoUrl(repoUrl);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  let analysis = null;
  try {
    analysis = await createAnalysisRecord({
      repo_url: normalized.repoUrl,
      repo_name: body.repoName || normalized.repo,
      status: "PROCESSING",
      source: "github",
      owner_email: ownerEmail,
    });

    const previous = await findLatestAnalysisByRepo(normalized.repoUrl, ownerEmail);
    const snapshot = await createGitHubSnapshot(normalized.repoPath, accessToken);
    let result = buildRepositoryAnalysis({
      repoUrl: snapshot.repoUrl,
      repoName: body.repoName || snapshot.repoName || normalized.repo,
      fileTree: snapshot.fileTree.slice(0, 5000),
      languages: snapshot.languages,
      repoData: snapshot.repoData,
      source: "github",
    });
    const detailedComponents = await enrichGitHubComponents(snapshot, normalized.repoPath, accessToken);
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
    const mergedEndpoints = mergeApiEndpoints(result.architecture.apiEndpoints, codeIntel.files);
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
    result = await maybeEnhanceAnalysisWithGroq(result, { snapshot, codeIntel });

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

    return NextResponse.json(updated);
  } catch (error) {
    if (analysis?.id) {
      await deleteAnalysisRecord(analysis.id).catch(() => {});
    }
    if (error.code === "AUTH_REQUIRED") {
      return NextResponse.json(
        { error: "Private repo detected. Sign in with GitHub to analyze it.", requiresAuth: true },
        { status: 403 },
      );
    }
    console.error("[analyze] error:", error);
    return NextResponse.json(
      { error: formatRouteError(error) },
      { status: error?.status || 500 },
    );
  }
}

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id");
  try {
    const session = await getCurrentSession();
    const ownerEmail = getSessionOwner(session);

    if (id) {
      const record = await getAnalysisRecord(id);
      ensureReadAccess(record, ownerEmail);
      return NextResponse.json(record);
    }

    const records = await listAnalysisRecords(ownerEmail);
    return NextResponse.json(records.map(serializeAnalysisRecord));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
