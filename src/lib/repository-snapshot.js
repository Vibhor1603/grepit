import JSZip from "jszip";
import { createHash } from "crypto";
import { fetchGitHubRepository, githubRequest } from "./github";

const TEXT_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".graphql",
  ".groovy",
  ".h",
  ".hpp",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".kts",
  ".mjs",
  ".md",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sql",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".vue",
  ".xml",
  ".yaml",
  ".yml",
]);

const BLOCKED_PATH_PATTERN = /(^|\/)(node_modules|\.git|\.next|dist|build|coverage|vendor|__pycache__|\.cache)(\/|$)|(^|\/)\.ssh(\/|$)|(^|\/)\.aws(\/|$)|(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)(\.pub)?$/i;
const BLOCKED_SECRET_FILE_PATTERN = /(^|\/)\.env(?:\.[^/]+)?$/i;
const BLOCKED_EXECUTABLE_PATTERN = /\.(exe|dll|so|dylib|bin|dmg|iso|msi|bat|cmd|ps1|scr|com)$/i;
const BLOCKED_ARCHIVE_PATTERN = /\.(zip|tar|tgz|gz|bz2|xz|rar|7z)$/i;
const MAX_TEXT_FILE_BYTES = 400_000;
const MAX_SINGLE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_FILES = 10_000;
const ROOT_LEVEL_SOURCE_FOLDERS = new Set([
  "src",
  "app",
  "lib",
  "public",
  "pages",
  "components",
  "api",
  "server",
  "client",
  "tests",
  "test",
  "docs",
  "scripts",
  "packages",
  "services",
  "config",
  "backend",
  "frontend",
]);

function extname(path) {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function normalizeSlashes(path = "") {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

function looksLikeEnvTemplate(path) {
  return /\.env\.(example|sample|template)$/i.test(path);
}

function isBlockedPath(path) {
  if (!path || path.includes("..")) return true;
  if (BLOCKED_PATH_PATTERN.test(path)) return true;
  if (BLOCKED_SECRET_FILE_PATTERN.test(path) && !looksLikeEnvTemplate(path)) return true;
  if (BLOCKED_EXECUTABLE_PATTERN.test(path)) return true;
  if (BLOCKED_ARCHIVE_PATTERN.test(path)) return true;
  return false;
}

function looksBinary(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
  let weird = 0;
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte < 7 || (byte > 14 && byte < 32)) weird += 1;
  }
  return weird / Math.max(1, sample.length) > 0.1;
}

function hashBuffer(buffer) {
  return createHash("sha1").update(buffer).digest("hex");
}

function hashStrings(values) {
  return createHash("sha1").update(values.join("\n")).digest("hex");
}

function createTextEntry(path, buffer) {
  return {
    path,
    size: buffer.length,
    hash: hashBuffer(buffer),
    ext: extname(path),
    content: buffer.toString("utf8"),
  };
}

function buildCommonRootPrefix(paths, preferredRoot = "") {
  const normalizedPaths = paths.map((path) => normalizeSlashes(path)).filter(Boolean);
  if (normalizedPaths.length === 0) return "";

  const normalizedPreferred = normalizeSlashes(preferredRoot).replace(/\/$/, "");
  if (
    normalizedPreferred
    && normalizedPaths.every((path) => path === normalizedPreferred || path.startsWith(`${normalizedPreferred}/`))
  ) {
    return `${normalizedPreferred}/`;
  }

  const firstSegments = normalizedPaths.map((path) => path.split("/")[0]).filter(Boolean);
  if (firstSegments.length !== normalizedPaths.length) return "";

  const shared = firstSegments[0];
  if (!shared) return "";
  if (!normalizedPreferred && ROOT_LEVEL_SOURCE_FOLDERS.has(shared.toLowerCase())) return "";
  if (!normalizedPaths.every((path) => path.startsWith(`${shared}/`))) return "";
  return `${shared}/`;
}

function normalizeEntryPath(path, rootPrefix = "") {
  const normalized = normalizeSlashes(path);
  if (!normalized || normalized.startsWith("__MACOSX/")) return "";
  if (rootPrefix && normalized.startsWith(rootPrefix)) {
    return normalized.slice(rootPrefix.length);
  }
  return normalized;
}

function finalizeSnapshotEntries(rawEntries, { preferredRoot = "" } = {}) {
  const rootPrefix = buildCommonRootPrefix(rawEntries.map((entry) => entry.path), preferredRoot);
  const fileTree = [];
  const textFiles = [];
  let totalUncompressedBytes = 0;

  for (const entry of rawEntries) {
    const path = normalizeEntryPath(entry.path, rootPrefix);
    if (!path || isBlockedPath(path)) continue;

    const buffer = entry.buffer;
    totalUncompressedBytes += buffer.length;
    if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error("Archive expands to too much data after extraction.");
    }

    if (buffer.length > MAX_SINGLE_FILE_BYTES) continue;

    fileTree.push({
      path,
      type: "blob",
      size: buffer.length,
      hash: hashBuffer(buffer),
      ext: extname(path),
    });

    if (buffer.length > MAX_TEXT_FILE_BYTES) continue;
    if (!TEXT_EXTENSIONS.has(extname(path))) continue;
    if (looksBinary(buffer)) continue;
    textFiles.push(createTextEntry(path, buffer));
  }

  return { fileTree, textFiles };
}

async function parseZipBuffer(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (entries.length > MAX_FILES) {
    throw new Error("Archive contains too many files.");
  }

  const rawEntries = [];
  for (const entry of entries) {
    rawEntries.push({
      path: entry.name,
      buffer: await entry.async("nodebuffer"),
    });
  }

  return finalizeSnapshotEntries(rawEntries);
}

export async function createFolderUploadSnapshot(files, folderName = "upload") {
  const list = Array.from(files || []);
  if (list.length === 0) {
    return {
      source: "upload",
      repoName: folderName,
      repoUrl: `upload://${folderName}`,
      fileTree: [],
      textFiles: [],
      repoData: {},
      languages: {},
      defaultBranch: "main",
      revision: hashStrings([folderName]),
    };
  }

  const rawEntries = [];
  for (const file of list) {
    rawEntries.push({
      path: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
    });
  }

  const parsed = finalizeSnapshotEntries(rawEntries, { preferredRoot: folderName });
  const languages = {};
  for (const entry of parsed.fileTree) {
    const extension = entry.path.split(".").pop()?.toLowerCase();
    if (extension) languages[extension] = (languages[extension] || 0) + 1;
  }

  return {
    source: "upload",
    repoName: String(folderName).slice(0, 100),
    repoUrl: `upload://${String(folderName).slice(0, 100)}`,
    fileTree: parsed.fileTree,
    textFiles: parsed.textFiles,
    languages,
    repoData: {},
    defaultBranch: "main",
    revision: hashStrings(parsed.fileTree.map((entry) => `${entry.path}:${entry.hash}`)),
  };
}

export function scopeSnapshotToPaths(snapshot, allowedPaths = []) {
  const pathSet = new Set((allowedPaths || []).map((entry) => typeof entry === "string" ? entry : entry?.path).filter(Boolean));
  if (pathSet.size === 0) return { ...snapshot, fileTree: [], textFiles: [] };

  return {
    ...snapshot,
    fileTree: (snapshot.fileTree || []).filter((entry) => pathSet.has(entry.path)),
    textFiles: (snapshot.textFiles || []).filter((entry) => pathSet.has(entry.path)),
  };
}

export async function createUploadSnapshot(file) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseZipBuffer(buffer);
  return {
    source: "upload",
    repoName: file.name.replace(/\.zip$/i, ""),
    repoUrl: `local://${file.name.replace(/\.zip$/i, "")}`,
    fileTree: parsed.fileTree,
    textFiles: parsed.textFiles,
    repoData: {},
    languages: {},
    revision: hashBuffer(buffer),
  };
}

export async function createGitHubSnapshot(repoPath, accessToken) {
  const repository = await fetchGitHubRepository(repoPath, accessToken);
  const archiveResponse = await githubRequest(`/repos/${repoPath}/zipball/${repository.defaultBranch}`, accessToken);

  if (!archiveResponse.ok) {
    throw new Error(`Failed to download repository archive (${archiveResponse.status}).`);
  }

  const arrayBuffer = await archiveResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const parsed = await parseZipBuffer(buffer);

  const languages = repository.languages || {};
  if (Object.keys(languages).length === 0) {
    for (const file of parsed.textFiles) {
      const extension = extname(file.path);
      if (extension === ".js" || extension === ".jsx") languages.JavaScript = (languages.JavaScript || 0) + file.size;
      if (extension === ".ts" || extension === ".tsx") languages.TypeScript = (languages.TypeScript || 0) + file.size;
      if (extension === ".py") languages.Python = (languages.Python || 0) + file.size;
      if (extension === ".go") languages.Go = (languages.Go || 0) + file.size;
      if (extension === ".java") languages.Java = (languages.Java || 0) + file.size;
      if (extension === ".rb") languages.Ruby = (languages.Ruby || 0) + file.size;
      if (extension === ".rs") languages.Rust = (languages.Rust || 0) + file.size;
    }
  }

  return {
    source: "github",
    repoName: repository.repoData.name,
    repoUrl: repository.repoData.html_url,
    repoData: repository.repoData,
    fileTree: parsed.fileTree,
    textFiles: parsed.textFiles,
    languages,
    defaultBranch: repository.defaultBranch,
    revision: repository.repoData.pushed_at || repository.repoData.default_branch || hashBuffer(buffer),
  };
}
