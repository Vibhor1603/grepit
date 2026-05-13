import { isGroqConfigured } from "./env";
import { buildGroqStructuredRequest, groqFetch } from "./groq";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function topLevelFolder(path) {
  const [first] = path.split("/");
  return first || path;
}

const ENTRY_POINT_CANDIDATES = [
  "src/main.tsx",
  "src/main.jsx",
  "src/index.tsx",
  "src/index.jsx",
  "src/index.ts",
  "src/index.js",
  "src/app/page.jsx",
  "src/app/page.tsx",
  "app/page.tsx",
  "app/page.jsx",
  "main.py",
  "app.py",
  "server.js",
  "server.ts",
  "index.js",
  "index.ts",
  "main.go",
  "cmd/main.go",
];

const FOLDER_PURPOSE_HINTS = {
  api: "Request handlers, controllers, and API endpoints.",
  app: "Application routing, pages, and runtime entrypoints.",
  assets: "Static images, icons, fonts, or bundled visual assets.",
  components: "Reusable UI building blocks and view composition.",
  config: "Project configuration and build/runtime settings.",
  controllers: "Request orchestration before service or data layers.",
  data: "Datasets, fixtures, migrations, or static content inputs.",
  db: "Database access, schema, and persistence helpers.",
  docs: "Documentation and onboarding material.",
  hooks: "Reusable stateful logic and framework hooks.",
  lib: "Shared utilities, services, and helper modules.",
  middleware: "Cross-cutting request or framework middleware.",
  models: "Domain models and persistence mapping objects.",
  pages: "Route-level page components or page handlers.",
  prisma: "Database schema and migration management.",
  public: "Publicly served static assets.",
  routes: "Route definitions and endpoint registration.",
  scripts: "Automation scripts and one-off developer tooling.",
  services: "Core business logic and service layer abstractions.",
  src: "Primary source code for the application.",
  store: "Shared state containers and data stores.",
  styles: "CSS, themes, and design tokens.",
  test: "Automated test suites and fixtures.",
  tests: "Automated test suites and fixtures.",
  utils: "Low-level utilities reused across modules.",
  views: "Composed screens, pages, or major rendered surfaces.",
};

function detectTechStack(filePaths, languages, repoData = {}) {
  const stack = [];
  const languageNames = Object.keys(languages || {});

  stack.push(...languageNames);

  if (filePaths.some((path) => path === "package.json")) stack.push("Node.js");
  if (filePaths.some((path) => path.startsWith("src/app/"))) stack.push("Next.js App Router");
  if (filePaths.some((path) => path.startsWith("src/pages/"))) stack.push("Next.js Pages Router");
  if (filePaths.some((path) => path.endsWith(".jsx") || path.endsWith(".tsx"))) stack.push("React");
  if (filePaths.some((path) => path === "tailwind.config.js" || path === "tailwind.config.mjs")) stack.push("Tailwind CSS");
  if (filePaths.some((path) => path.includes("next-auth"))) stack.push("NextAuth.js");
  if (filePaths.some((path) => path.includes("supabase"))) stack.push("Supabase");
  if (repoData.private) stack.push("Private GitHub Repository");

  return unique(stack).slice(0, 12);
}

function detectProjectType(filePaths) {
  if (filePaths.some((path) => path.startsWith("src/app/api/"))) return "Full-stack web application";
  if (filePaths.some((path) => path.endsWith(".tsx") || path.endsWith(".jsx"))) return "Frontend web application";
  if (filePaths.some((path) => path.startsWith("api/"))) return "API service";
  return "Software project";
}

function detectEntryPoints(filePaths) {
  const set = new Set(filePaths);
  const exactMatches = ENTRY_POINT_CANDIDATES.filter((candidate) => set.has(candidate));
  if (exactMatches.length > 0) return exactMatches.slice(0, 5);

  return filePaths.filter((path) => /(^|\/)(index|main|app|server)\.(js|ts|jsx|tsx|py|go|rb|rs|java)$/.test(path)).slice(0, 5);
}

function buildKeyFolders(filePaths) {
  const folderStats = new Map();
  for (const path of filePaths) {
    const parts = path.split("/");
    if (parts.length < 2) continue;
    const folder = parts[0];
    folderStats.set(folder, (folderStats.get(folder) || 0) + 1);
  }

  return [...folderStats.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([folder, count]) => ({
      name: folder,
      fileCount: count,
      purpose: FOLDER_PURPOSE_HINTS[folder.toLowerCase()] || "Likely groups related source files or project artifacts.",
    }));
}

function detectImportantFiles(filePaths) {
  const priorityMatchers = [
    /(^|\/)(readme|README)\.md$/,
    /(^|\/)package\.json$/,
    /(^|\/)tsconfig\.json$/,
    /(^|\/)requirements\.txt$/,
    /(^|\/)dockerfile$/i,
    /(^|\/)\.env\.example$/,
    /(^|\/)compose\.ya?ml$/,
    /(^|\/)next\.config\./,
    /(^|\/)tailwind\.config\./,
    /(^|\/)prisma\/schema\.prisma$/,
  ];

  return filePaths.filter((path) => priorityMatchers.some((matcher) => matcher.test(path))).slice(0, 10);
}

function inferToolsAndVersions(filePaths, techStack) {
  const tools = [];
  if (filePaths.includes("package.json")) tools.push("Node.js and npm");
  if (filePaths.some((path) => path.startsWith("prisma/"))) tools.push("Prisma CLI");
  if (techStack.includes("React")) tools.push("Modern browser with JavaScript enabled");
  if (filePaths.includes("requirements.txt")) tools.push("Python and pip");
  if (filePaths.some((path) => path.endsWith(".go"))) tools.push("Go toolchain");
  if (filePaths.some((path) => path.endsWith(".rs"))) tools.push("Rust and Cargo");
  return unique(tools);
}

function detectEnvVars(filePaths) {
  const envFiles = filePaths.filter((path) => path.includes(".env"));
  const generic = [];
  if (envFiles.length > 0) generic.push("Runtime environment variables are expected; check the env template files.");
  if (filePaths.some((path) => path.includes("next-auth"))) generic.push("Authentication secrets and OAuth client credentials are required.");
  if (filePaths.some((path) => path.includes("supabase"))) generic.push("Supabase project URL, anon key, and service role key are required.");
  return unique(generic);
}

function detectDuplicates(filePaths) {
  const fileNameCounts = new Map();
  for (const path of filePaths) {
    const fileName = path.split("/").pop();
    fileNameCounts.set(fileName, (fileNameCounts.get(fileName) || 0) + 1);
  }

  return [...fileNameCounts.entries()]
    .filter(([, count]) => count > 1)
    .slice(0, 8)
    .map(([name, count]) => `${name} appears ${count} times across the repository.`);
}

function detectPerformanceRisks(filePaths) {
  const risks = [];
  const largeConfigCount = filePaths.filter((path) => /\.(json|yaml|yml)$/.test(path)).length;
  if (largeConfigCount > 20) {
    risks.push("Many configuration or data files are checked in; loading and parsing them repeatedly could be expensive.");
  }
  if (filePaths.filter((path) => /\.(png|jpg|jpeg|gif|mp4|mov)$/.test(path)).length > 20) {
    risks.push("The repository contains many heavy asset files, which may affect clone, build, or bundle times.");
  }
  if (filePaths.some((path) => path.includes("api")) && !filePaths.some((path) => /cache/i.test(path))) {
    risks.push("No obvious caching layer was detected around API or data-fetching code.");
  }
  return risks;
}

function detectComplexityHotspots(filePaths) {
  const directoryCounts = new Map();
  for (const path of filePaths) {
    const dir = path.split("/").slice(0, 2).join("/");
    directoryCounts.set(dir, (directoryCounts.get(dir) || 0) + 1);
  }

  return [...directoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, weight: count }));
}

function buildLayers(filePaths) {
  const buckets = new Map([
    ["Frontend", []],
    ["API", []],
    ["Data", []],
    ["Configuration", []],
    ["Documentation", []],
  ]);

  for (const path of filePaths) {
    if (path.startsWith("src/components/") || path.startsWith("src/app/")) {
      buckets.get("Frontend").push(path);
    } else if (path.startsWith("src/app/api/")) {
      buckets.get("API").push(path);
    } else if (path.startsWith("src/lib/")) {
      buckets.get("Data").push(path);
    } else if (path.endsWith(".md")) {
      buckets.get("Documentation").push(path);
    } else if (path.includes("config") || path.startsWith(".github/")) {
      buckets.get("Configuration").push(path);
    }
  }

  return [...buckets.entries()]
    .filter(([, modules]) => modules.length > 0)
    .map(([name, modules]) => ({
      name,
      modules: unique(modules.map(topLevelFolder)).slice(0, 8),
    }));
}

function buildDependencies(layers) {
  const order = layers.map((layer) => layer.name);
  const dependencies = [];

  for (let index = 0; index < order.length - 1; index += 1) {
    dependencies.push({
      from: order[index],
      to: order[index + 1],
    });
  }

  return dependencies;
}

function detectApiEndpoints(filePaths) {
  return filePaths
    .filter((path) => path.startsWith("src/app/api/") && path.endsWith("/route.js"))
    .map((path) => {
      const routePath = path
        .replace("src/app/api", "/api")
        .replace("/route.js", "")
        .replace(/\[(.+?)\]/g, ":$1");

      return {
        method: "GET/POST",
        path: routePath || "/api",
        file: path,
        description: "Route handler discovered from the app router file structure.",
      };
    });
}

function detectComponents(filePaths) {
  return filePaths
    .filter((path) => path.startsWith("src/components/") && /\.(jsx|tsx)$/.test(path))
    .slice(0, 20)
    .map((path) => ({
      name: path.split("/").pop().replace(/\.(jsx|tsx)$/, ""),
      file: path,
      props: [],
      children: [],
      usedIn: [],
      summary: "",
    }));
}

function detectSecurityIssues(filePaths, repoData) {
  const findings = [];

  if (!filePaths.some((path) => path === ".env.example")) {
    findings.push({
      severity: "medium",
      title: "Missing environment template",
      description: "The repository has runtime configuration but no checked-in env template for safer setup.",
      file: ".env.example",
    });
  }

  if (filePaths.some((path) => path.includes("supabase"))) {
    findings.push({
      severity: "low",
      title: "Legacy data client detected",
      description: "Supabase wiring is still present, which increases the chance of split auth or data paths.",
      file: "src/lib",
    });
  }

  if (repoData.private) {
    findings.push({
      severity: "low",
      title: "Private repository access",
      description: "Access depends on GitHub OAuth scopes and should be limited to signed-in owners or collaborators.",
      file: "src/app/api/analyze/route.js",
    });
  }

  return findings;
}

function detectCodeSmells(filePaths) {
  const smells = [];

  if (filePaths.some((path) => path === "README.md")) {
    smells.push({
      file: "README.md",
      issue: "Repository documentation was scaffolded and likely outdated.",
      suggestion: "Document environment variables, OAuth setup, and local development commands.",
    });
  }

  if (filePaths.some((path) => path.startsWith("src/app/api/"))) {
    smells.push({
      file: "src/app/api",
      issue: "Server routes perform multiple responsibilities.",
      suggestion: "Keep GitHub access, persistence, and summarization in shared services.",
    });
  }

  return smells;
}

function detectTestGaps(filePaths) {
  const hasTests = filePaths.some((path) => /(\.test\.|\.spec\.)/.test(path));
  if (hasTests) return [];

  return [
    "No automated tests were detected for API routes.",
    "Authentication and rate-limiting flows do not appear to have regression coverage.",
    "Repository analysis heuristics should have unit tests for URL parsing and file classification.",
  ];
}

function detectFlowPaths(filePaths) {
  const flows = [];

  if (filePaths.some((path) => path === "src/components/LandingPage.jsx")) {
    flows.push({
      name: "Repository analysis",
      steps: [
        "User enters a GitHub URL on the landing page.",
        "Frontend posts the repository URL to /api/analyze.",
        "Server fetches GitHub metadata and stores the analysis.",
        "Dashboard loads the stored analysis by id.",
      ],
    });
  }

  if (filePaths.some((path) => path.endsWith("[...nextauth]/route.js"))) {
    flows.push({
      name: "GitHub sign-in",
      steps: [
        "User starts GitHub OAuth from the landing page or dashboard.",
        "NextAuth exchanges the code for GitHub tokens.",
        "Session callback exposes the access token to server-side routes.",
        "Private repository analysis reuses the server-side token.",
      ],
    });
  }

  return flows;
}

function detectMlInsights(filePaths) {
  return {
    models: filePaths.some((path) => path.includes("ai")) ? ["Heuristic repository summarizer"] : [],
    pipelines: filePaths.some((path) => path.includes("api/query")) ? ["Interactive codebase Q&A"] : [],
    dataFiles: filePaths.filter((path) => /\.(json|csv|parquet)$/.test(path)).slice(0, 10),
  };
}

function buildSetupSteps(filePaths, techStack) {
  const steps = ["Install dependencies with npm install."];

  if (techStack.includes("Supabase")) {
    steps.push("Create a .env.local file from .env.example and add your Supabase project URL, anon key, and service role key.");
    steps.push("Run the SQL in supabase/schema.sql inside the Supabase SQL editor to create the required tables and policies.");
  }

  if (techStack.includes("Next.js App Router") || techStack.includes("React")) {
    steps.push("Start the development server with npm run dev.");
  }

  if (filePaths.some((path) => path.endsWith("[...nextauth]/route.js"))) {
    steps.push("Configure a GitHub OAuth app and set GITHUB_ID, GITHUB_SECRET, NEXTAUTH_URL, and NEXTAUTH_SECRET.");
  }

  return steps;
}

function trimPreview(text = "", max = 1400) {
  const normalized = text.replace(/\s+\n/g, "\n").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}\n...`;
}

function buildRepresentativeFiles(snapshot, codeIntel = null) {
  const textFiles = snapshot?.textFiles || [];
  const intelByPath = new Map(((codeIntel?.files) || []).map((file) => [file.path, file]));
  const chosen = [];
  const seen = new Set();
  const patterns = [
    /(^|\/)README\.md$/i,
    /(^|\/)package\.json$/,
    /(^|\/)(src\/app\/page|app\/page|src\/pages\/index)\.(js|jsx|ts|tsx)$/,
    /(^|\/)(src\/app\/layout|app\/layout)\.(js|jsx|ts|tsx)$/,
    /(^|\/)src\/app\/api\/.+\/route\.(js|ts)$/,
    /(^|\/)(src\/pages\/api|pages\/api)\/.+\.(js|ts)$/,
    /(^|\/)(src\/components|components)\/.+\.(jsx|tsx)$/,
    /(^|\/)(src\/lib|lib|services|backend\/src)\/.+\.(js|ts|py|go|java)$/,
    /(^|\/)(main|app|server|index)\.(js|ts|py|go|java)$/,
  ];

  const pushFile = (entry) => {
    if (!entry || seen.has(entry.path)) return;
    seen.add(entry.path);
    const intel = intelByPath.get(entry.path);
    chosen.push({
      path: entry.path,
      language: intel?.language || entry.ext || "unknown",
      fileKind: intel?.fileKind || "source file",
      summary: intel?.summary || "",
      contentPreview: trimPreview(entry.content),
    });
  };

  for (const pattern of patterns) {
    pushFile(textFiles.find((entry) => pattern.test(entry.path)));
  }

  const scoredRemainder = textFiles
    .filter((entry) => !seen.has(entry.path))
    .map((entry) => {
      const intel = intelByPath.get(entry.path);
      let score = 0;
      if (intel?.endpoints?.length) score += 8;
      if (intel?.functions?.length) score += 6;
      if (intel?.classes?.length) score += 5;
      if (intel?.imports?.length) score += 3;
      if (intel?.selectors?.length) score += 4;
      if (intel?.topLevelKeys?.length) score += 3;
      if (/config|schema|auth|query|analy|dashboard|report/i.test(entry.path)) score += 4;
      score += Math.min(6, Math.ceil((intel?.lineCount || 0) / 80));
      return { entry, score };
    })
    .sort((a, b) => b.score - a.score);

  for (const item of scoredRemainder) {
    if (chosen.length >= 10) break;
    pushFile(item.entry);
  }

  return chosen.slice(0, 10);
}

export function buildRepositoryAnalysis({
  repoUrl,
  repoName,
  fileTree,
  languages,
  repoData = {},
  source = "github",
}) {
  const filePaths = fileTree.map((entry) => entry.path);
  const totalFiles = fileTree.filter((entry) => entry.type === "blob").length;
  const totalBytes = fileTree.reduce((sum, entry) => sum + (entry.size || 0), 0);
  const projectType = detectProjectType(filePaths);
  const techStack = detectTechStack(filePaths, languages, repoData);
  const layers = buildLayers(filePaths);
  const architecture = {
    summary: `${repoName} looks like a ${projectType.toLowerCase()} with ${totalFiles} tracked files and ${Object.keys(languages || {}).length} detected languages.`,
    projectType,
    techStack,
    patterns: unique([
      filePaths.some((path) => path.startsWith("src/app/api/")) ? "App Router route handlers" : null,
      filePaths.some((path) => path.startsWith("src/components/")) ? "Component-based UI" : null,
      filePaths.some((path) => path.includes("supabase")) ? "Supabase-backed persistence" : null,
    ]),
    layers,
    dependencies: buildDependencies(layers),
    suggestions: [
      "Add automated tests around authentication and analysis routes.",
      "Document required environment variables for local setup.",
      "Keep analysis logic in shared server-side services to avoid duplicated route logic.",
    ],
    apiEndpoints: detectApiEndpoints(filePaths),
    components: detectComponents(filePaths),
    securityIssues: detectSecurityIssues(filePaths, repoData),
    setupSteps: buildSetupSteps(filePaths, techStack),
    codeSmells: detectCodeSmells(filePaths),
    testGaps: detectTestGaps(filePaths),
    flowPaths: detectFlowPaths(filePaths),
    mlInsights: detectMlInsights(filePaths),
    entryPoints: detectEntryPoints(filePaths),
    keyFolders: buildKeyFolders(filePaths),
    importantFiles: detectImportantFiles(filePaths),
    requiredTools: inferToolsAndVersions(filePaths, techStack),
    environmentNotes: detectEnvVars(filePaths),
    duplicateCodeSignals: detectDuplicates(filePaths),
    performanceRisks: detectPerformanceRisks(filePaths),
    complexityHeatmap: detectComplexityHotspots(filePaths),
  };

  return {
    source,
    repoUrl,
    repoName,
    summary: architecture.summary,
    totalFiles,
    totalLines: Math.max(1, Math.round(totalBytes / 40)),
    languages,
    fileTree,
    architecture,
    results: {
      ...architecture,
      repoData: {
        description: repoData.description || "",
        stars: repoData.stargazers_count || 0,
        forks: repoData.forks_count || 0,
        defaultBranch: repoData.default_branch || "main",
      },
    },
    isPrivate: Boolean(repoData.private),
  };
}

export async function maybeEnhanceAnalysisWithGroq(baseAnalysis, context = {}) {
  if (!isGroqConfigured()) {
    return baseAnalysis;
  }

  try {
    const filePaths = (baseAnalysis.fileTree || []).slice(0, 200).map((entry) => entry.path);
    const representativeFiles = buildRepresentativeFiles(context.snapshot, context.codeIntel);

    // Build the user payload and cap it at ~48,000 chars to avoid token overflow
    const rawPayload = JSON.stringify({
      repoUrl: baseAnalysis.repoUrl,
      repoName: baseAnalysis.repoName,
      languages: baseAnalysis.languages,
      repoDescription: baseAnalysis.results?.repoData?.description || "",
      files: filePaths,
      entryPoints: baseAnalysis.architecture?.entryPoints || [],
      keyFolders: baseAnalysis.architecture?.keyFolders || [],
      importantFiles: baseAnalysis.architecture?.importantFiles || [],
      endpoints: (baseAnalysis.results?.apiEndpoints || []).slice(0, 12),
      components: (baseAnalysis.results?.components || []).slice(0, 12).map((component) => ({
        name: component.name,
        file: component.file,
        summary: component.summary,
      })),
      fileIntel: (context.codeIntel?.files || []).slice(0, 20).map((file) => ({
        path: file.path,
        language: file.language,
        fileKind: file.fileKind,
        summary: file.summary,
        why: file.why,
      })),
      representativeFiles,
    });

    // Hard cap at ~48,000 chars (~12,000 tokens) before sending
    const cappedPayload = rawPayload.length > 48_000
      ? rawPayload.slice(0, 48_000) + "...}"
      : rawPayload;

    const response = await groqFetch(buildGroqStructuredRequest({
      temperature: 0.15,
      maxCompletionTokens: 3200,
      schemaName: "analysis_enrichment",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          summary: { type: "string" },
          userFacingPurpose: { type: "string" },
          mainCapabilities: { type: "array", items: { type: "string" } },
          projectType: { type: "string" },
          techStack: { type: "array", items: { type: "string" } },
          patterns: { type: "array", items: { type: "string" } },
          suggestions: { type: "array", items: { type: "string" } },
          securityIssues: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                severity: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                file: { type: "string" },
              },
              required: ["severity", "title", "description", "file"],
            },
          },
          setupSteps: { type: "array", items: { type: "string" } },
          testGaps: { type: "array", items: { type: "string" } },
          flowPaths: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                steps: { type: "array", items: { type: "string" } },
              },
              required: ["name", "steps"],
            },
          },
        },
        required: ["summary", "userFacingPurpose", "mainCapabilities", "projectType", "techStack", "patterns", "suggestions", "securityIssues", "setupSteps", "testGaps", "flowPaths"],
      },
      messages: [
        {
          role: "system",
          content:
            "You analyze software repositories for developers. Base every claim on the provided evidence. Prefer concrete product behavior over abstract file statistics. If the evidence is incomplete, say the repository 'appears to' do something instead of overstating it. `summary` should be a concise high-level repo description. `userFacingPurpose` should explain what the product or system does in plain English. `mainCapabilities` should be a short list of real end-user or developer-facing capabilities grounded in the files, endpoints, and code samples provided.",
        },
        {
          role: "user",
          content: cappedPayload,
        },
      ],
    }));

    if (!response.ok) {
      return baseAnalysis;
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return baseAnalysis;
    }

    const enhanced = JSON.parse(content);

    return {
      ...baseAnalysis,
      summary: enhanced.summary || baseAnalysis.summary,
      architecture: {
        ...baseAnalysis.architecture,
        ...enhanced,
        layers: baseAnalysis.architecture.layers,
        dependencies: baseAnalysis.architecture.dependencies,
        apiEndpoints: baseAnalysis.architecture.apiEndpoints,
        components: baseAnalysis.architecture.components,
        codeSmells: baseAnalysis.architecture.codeSmells,
        mlInsights: baseAnalysis.architecture.mlInsights,
        entryPoints: baseAnalysis.architecture.entryPoints,
        keyFolders: baseAnalysis.architecture.keyFolders,
        importantFiles: baseAnalysis.architecture.importantFiles,
        requiredTools: baseAnalysis.architecture.requiredTools,
        environmentNotes: baseAnalysis.architecture.environmentNotes,
        duplicateCodeSignals: baseAnalysis.architecture.duplicateCodeSignals,
        performanceRisks: baseAnalysis.architecture.performanceRisks,
        complexityHeatmap: baseAnalysis.architecture.complexityHeatmap,
      },
      results: {
        ...baseAnalysis.results,
        ...enhanced,
      },
    };
  } catch {
    return baseAnalysis;
  }
}

export function mergeAnalysisDetails(baseAnalysis, details = {}) {
  const nextArchitecture = {
    ...baseAnalysis.architecture,
    ...details,
    components: details.components || baseAnalysis.architecture.components,
    flowPaths: details.flowPaths || baseAnalysis.architecture.flowPaths,
  };

  return {
    ...baseAnalysis,
    architecture: nextArchitecture,
    results: {
      ...baseAnalysis.results,
      ...details,
      components: nextArchitecture.components,
      flowPaths: nextArchitecture.flowPaths,
    },
  };
}

export function buildQueryResponse(analysis, question) {
  const lower = question.toLowerCase();
  const architecture = analysis?.architecture || {};

  if (lower.includes("security")) {
    const issues = architecture.securityIssues || [];
    if (issues.length === 0) {
      return "No obvious security issues were inferred from the repository structure alone. I would still add secret scanning, auth tests, and dependency auditing.";
    }
    return issues
      .map((issue) => `- ${issue.severity.toUpperCase()}: ${issue.title} (${issue.file})`)
      .join("\n");
  }

  if (lower.includes("setup")) {
    const steps = architecture.setupSteps || [];
    return steps.length > 0 ? steps.map((step, index) => `${index + 1}. ${step}`).join("\n") : "No setup guide was inferred.";
  }

  if (lower.includes("api")) {
    const endpoints = architecture.apiEndpoints || [];
    return endpoints.length > 0
      ? endpoints.map((endpoint) => `- ${endpoint.method} ${endpoint.path} from ${endpoint.file}`).join("\n")
      : "No API endpoints were inferred from the current analysis.";
  }

  if (lower.includes("component")) {
    const components = architecture.components || [];
    return components.length > 0
      ? components.map((component) => `- ${component.name} (${component.file})`).join("\n")
      : "No frontend components were inferred from the repository structure.";
  }

  if (lower.includes("entry")) {
    const entries = architecture.entryPoints || [];
    return entries.length ? entries.map((entry) => `- ${entry}`).join("\n") : "No obvious entry points were inferred.";
  }

  if (lower.includes("folder") || lower.includes("directory")) {
    const folders = architecture.keyFolders || [];
    return folders.length
      ? folders.map((folder) => `- ${folder.name}: ${folder.purpose}`).join("\n")
      : "No key folder breakdown is available.";
  }

  if (lower.includes("query") || lower.includes("search") || lower.includes("travers")) {
    const queryArchitecture = analysis?.results?.queryArchitecture || architecture.queryArchitecture;
    if (queryArchitecture) {
      return [
        `Strategy: ${queryArchitecture.strategy}`,
        queryArchitecture.summary,
        ...(queryArchitecture.phases || []).map((phase) => `- ${phase}`),
      ].join("\n");
    }
  }

  return [
    `Repository: ${analysis?.repo_name || analysis?.repoName || "Unknown"}`,
    `Summary: ${analysis?.summary || "No summary available."}`,
    `Tech stack: ${(architecture.techStack || []).join(", ") || "Unknown"}`,
    `Key layers: ${(architecture.layers || []).map((layer) => layer.name).join(", ") || "Unknown"}`,
  ].join("\n");
}
