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

function extname(path) {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function normalizeArchivePath(path) {
  return path.replace(/\\/g, "/").replace(/^[^/]+\//, "");
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

function createTextEntry(path, buffer) {
  return {
    path,
    size: buffer.length,
    hash: hashBuffer(buffer),
    ext: extname(path),
    content: buffer.toString("utf8"),
  };
}

async function parseZipBuffer(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const textFiles = [];
  const fileTree = [];

  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const path = normalizeArchivePath(entry.name);
    if (!path || path.startsWith("__MACOSX/")) continue;

    const fileBuffer = await entry.async("nodebuffer");
    fileTree.push({
      path,
      type: "blob",
      size: fileBuffer.length,
      hash: hashBuffer(fileBuffer),
      ext: extname(path),
    });

    if (fileBuffer.length > 400_000) continue;
    if (!TEXT_EXTENSIONS.has(extname(path))) continue;
    if (looksBinary(fileBuffer)) continue;
    textFiles.push(createTextEntry(path, fileBuffer));
  }

  return { fileTree, textFiles };
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
      const ext = extname(file.path);
      if (ext === ".js" || ext === ".jsx") languages.JavaScript = (languages.JavaScript || 0) + file.size;
      if (ext === ".ts" || ext === ".tsx") languages.TypeScript = (languages.TypeScript || 0) + file.size;
      if (ext === ".py") languages.Python = (languages.Python || 0) + file.size;
      if (ext === ".go") languages.Go = (languages.Go || 0) + file.size;
      if (ext === ".java") languages.Java = (languages.Java || 0) + file.size;
      if (ext === ".rb") languages.Ruby = (languages.Ruby || 0) + file.size;
      if (ext === ".rs") languages.Rust = (languages.Rust || 0) + file.size;
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
