import { extractQueryTerms, queryCodebase } from "./codebase-index";
import { fetchGitHubFileText, normalizeGitHubRepoUrl } from "./github";
import { sanitizeUntrustedTextForPrompt, summarizePromptSecurity } from "./prompt-security";

const SOURCE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json"];

function extname(path = "") {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function normalizePath(path = "") {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

function dirname(path = "") {
  const normalized = normalizePath(path);
  const parts = normalized.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function joinPath(...parts) {
  return normalizePath(parts.filter(Boolean).join("/"));
}

function basename(path = "") {
  const normalized = normalizePath(path);
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || normalized;
}

function detectLanguageFromPath(path = "") {
  const extension = extname(path);
  if ([".js", ".jsx", ".mjs", ".cjs"].includes(extension)) return "javascript";
  if ([".ts", ".tsx"].includes(extension)) return "typescript";
  if (extension === ".py") return "python";
  if (extension === ".go") return "go";
  if (extension === ".java") return "java";
  if (extension === ".rb") return "ruby";
  if (extension === ".rs") return "rust";
  if (extension === ".json") return "json";
  if (extension === ".md") return "markdown";
  return extension.replace(/^\./, "") || "unknown";
}

function resolveImportSpecifier(fromPath, specifier, pathSet) {
  if (!specifier) return null;

  const trimmed = specifier.trim();
  const candidates = [];

  if (trimmed.startsWith(".")) {
    candidates.push(joinPath(dirname(fromPath), trimmed));
  } else if (trimmed.startsWith("@/") || trimmed.startsWith("~/")) {
    candidates.push(joinPath("src", trimmed.slice(2)));
  } else if (trimmed.startsWith("src/") || trimmed.startsWith("app/")) {
    candidates.push(normalizePath(trimmed));
  } else {
    return null;
  }

  for (const candidate of candidates) {
    const attempts = [candidate];
    if (!extname(candidate)) {
      for (const extension of SOURCE_EXTENSIONS) attempts.push(`${candidate}${extension}`);
      for (const extension of SOURCE_EXTENSIONS) attempts.push(joinPath(candidate, `index${extension}`));
    }

    for (const attempt of attempts) {
      if (pathSet.has(attempt)) return attempt;
    }
  }

  return null;
}

function pushReason(reasonMap, path, reason) {
  if (!path || !reason) return;
  if (!reasonMap.has(path)) reasonMap.set(path, new Set());
  reasonMap.get(path).add(reason);
}

function buildMissingFileCandidates(analysis, query, indexedPaths, maxCandidates = 6) {
  const fileTree = (analysis?.file_tree || analysis?.fileTree || []).filter((entry) => entry?.type === "blob");
  const terms = extractQueryTerms(query);
  const loweredQuery = String(query || "").toLowerCase().trim();

  return fileTree
    .filter((entry) => entry?.path && !indexedPaths.has(entry.path))
    .map((entry) => {
      const path = entry.path.toLowerCase();
      const name = basename(entry.path).toLowerCase();
      const segments = path.split("/");
      let score = 0;
      const reasons = [];

      if (loweredQuery && path.includes(loweredQuery)) {
        score += 6;
        reasons.push(`path matches \`${loweredQuery}\``);
      }

      for (const term of terms) {
        if (name === term) {
          score += 10;
          reasons.push(`filename equals \`${term}\``);
          continue;
        }
        if (segments.includes(term)) {
          score += 8;
          reasons.push(`path segment matches \`${term}\``);
          continue;
        }
        if (path.includes(term)) {
          score += 5;
          reasons.push(`path contains \`${term}\``);
        }
      }

      return {
        path: entry.path,
        score,
        reasons: [...new Set(reasons)].slice(0, 4),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, maxCandidates);
}

export function collectRelevantContext(analysis, query, {
  forcedFilePaths = [],
  vectorResults = [],
  maxFiles = 8,
  maxCodeCharsPerFile = 12_000,
} = {}) {
  const files = analysis?.results?.files || [];
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const pathSet = new Set(files.map((file) => file.path));
  const queryResult = queryCodebase(analysis, query, { maxFiles: Math.max(maxFiles, 8), maxSymbols: 10, maxGraphDepth: 2 });
  const orderedPaths = [];
  const reasonMap = new Map();
  const loweredQuery = String(query || "").toLowerCase();

  const addPath = (path, reason) => {
    if (!path || !fileByPath.has(path)) return;
    if (!orderedPaths.includes(path)) orderedPaths.push(path);
    pushReason(reasonMap, path, reason);
  };

  for (const forcedPath of forcedFilePaths || []) {
    const exact = fileByPath.get(forcedPath);
    const fuzzy = exact ? null : files.find((file) => file.path.endsWith(forcedPath));
    addPath(exact?.path || fuzzy?.path, "user attached this file");
  }

  for (const match of queryResult.fileMatches || []) {
    addPath(match.path, (match.reasons || []).join("; ") || "direct query match");
  }

  for (const result of vectorResults || []) {
    addPath(result.filePath, `semantic search hit (${Number(result.similarity || 0).toFixed(3)})`);
  }

  for (const file of files) {
    if (orderedPaths.length >= maxFiles * 2) break;
    const pathLower = file.path.toLowerCase();
    const nameLower = basename(file.path).toLowerCase();
    if ((nameLower.length > 2 && loweredQuery.includes(nameLower)) || loweredQuery.includes(pathLower)) {
      addPath(file.path, "explicit path or filename mention");
    }
  }

  const missingCandidates = buildMissingFileCandidates(analysis, query, pathSet);
  for (const candidate of missingCandidates) {
    pushReason(reasonMap, candidate.path, candidate.reasons.join("; "));
  }

  const seeds = [...orderedPaths];
  for (const path of seeds) {
    const file = fileByPath.get(path);
    if (!file) continue;
    for (const specifier of file.imports || []) {
      const resolved = resolveImportSpecifier(path, specifier, pathSet);
      if (resolved) addPath(resolved, `imported by ${path}`);
    }
  }

  const promptMetas = [];
  const promptFiles = orderedPaths.slice(0, maxFiles).map((path) => {
    const file = fileByPath.get(path);
    const sanitized = sanitizeUntrustedTextForPrompt(file.code || "", { path: file.path, maxChars: maxCodeCharsPerFile });
    promptMetas.push(sanitized.meta);

    return {
      path: file.path,
      summary: file.summary,
      why: file.why,
      language: file.language,
      functions: (file.functions || []).map((item) => ({ name: item.name, args: item.args })).slice(0, 12),
      classes: (file.classes || []).map((item) => item.name).slice(0, 8),
      imports: (file.imports || []).slice(0, 12),
      matchReasons: [...(reasonMap.get(path) || [])].slice(0, 4),
      promptSecurity: sanitized.meta,
      code: sanitized.text,
    };
  });

  return {
    queryResult,
    promptFiles,
    missingCandidates,
    promptSecurity: summarizePromptSecurity(promptMetas),
  };
}

export async function hydratePromptFiles(analysis, promptFiles, missingCandidates, {
  accessToken,
  maxExtraFiles = 3,
  maxCodeCharsPerFile = 12_000,
} = {}) {
  if (analysis?.source !== "github" || !analysis?.repo_url || !missingCandidates?.length) {
    return promptFiles;
  }

  let normalized;
  try {
    normalized = normalizeGitHubRepoUrl(analysis.repo_url);
  } catch {
    return promptFiles;
  }

  const ref = analysis?.results?.incremental?.revision || "HEAD";
  const extraFiles = await Promise.all(
    missingCandidates.slice(0, maxExtraFiles).map(async (candidate) => {
      const code = await fetchGitHubFileText(normalized.repoPath, ref, candidate.path, accessToken).catch(() => null);
      if (!code) return null;
      const sanitized = sanitizeUntrustedTextForPrompt(code, { path: candidate.path, maxChars: maxCodeCharsPerFile });
      return {
        path: candidate.path,
        summary: "Live-fetched source file",
        why: "Fetched on demand because it matched the query but was outside the stored deep index.",
        language: detectLanguageFromPath(candidate.path),
        functions: [],
        classes: [],
        imports: [],
        matchReasons: candidate.reasons,
        promptSecurity: sanitized.meta,
        code: sanitized.text,
      };
    }),
  );

  return [...promptFiles, ...extraFiles.filter(Boolean)];
}
