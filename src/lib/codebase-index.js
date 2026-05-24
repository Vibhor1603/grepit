const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "what",
  "where",
  "when",
  "how",
  "why",
  "does",
  "into",
  "about",
  "show",
  "give",
  "tell",
  "please",
  "repo",
  "project",
  "codebase",
  "code",
  "file",
  "files",
  "folder",
  "folders",
  "directory",
  "directories",
]);

const SOURCE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json"];

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function sortByScoreDescending(items) {
  return [...items].sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}

function extname(path) {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function normalizePath(path = "") {
  const parts = [];
  for (const rawPart of path.replace(/\\/g, "/").split("/")) {
    const part = rawPart.trim();
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

function dirname(path = "") {
  const normalized = normalizePath(path);
  const parts = normalized.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function basename(path = "") {
  const normalized = normalizePath(path);
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || normalized;
}

function splitSegments(path = "") {
  return normalizePath(path).split("/").filter(Boolean);
}

function joinPath(...parts) {
  return normalizePath(parts.filter(Boolean).join("/"));
}

function dedupeEdges(edges = []) {
  const seen = new Set();
  const result = [];
  for (const edge of edges) {
    if (!edge?.from || !edge?.to) continue;
    const key = `${edge.from}=>${edge.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(edge);
  }
  return result;
}

function parseFileRef(reference = "") {
  if (!reference) return null;
  return reference.includes("#") ? reference.slice(0, reference.indexOf("#")) : reference;
}

function createDirectoryMap(filePaths = []) {
  const directories = new Map();

  const ensureDirectory = (path) => {
    const normalized = normalizePath(path);
    if (directories.has(normalized)) return directories.get(normalized);
    const entry = {
      path: normalized,
      name: normalized ? basename(normalized) : "",
      parent: normalized ? dirname(normalized) : null,
      depth: splitSegments(normalized).length,
      children: new Set(),
      files: new Set(),
      fileCount: 0,
      descendantFileCount: 0,
    };
    directories.set(normalized, entry);
    if (normalized) {
      const parentPath = dirname(normalized);
      const parent = ensureDirectory(parentPath);
      parent.children.add(normalized);
    }
    return entry;
  };

  ensureDirectory("");

  for (const filePath of filePaths) {
    const segments = splitSegments(filePath);
    let current = "";
    for (let index = 0; index < segments.length - 1; index += 1) {
      current = joinPath(current, segments[index]);
      ensureDirectory(current);
    }
    ensureDirectory(dirname(filePath)).files.add(filePath);
  }

  const ordered = [...directories.values()].sort((a, b) => b.depth - a.depth);
  for (const directory of ordered) {
    directory.fileCount = directory.files.size;
    directory.descendantFileCount = directory.fileCount;
    for (const childPath of directory.children) {
      const child = directories.get(childPath);
      if (child) directory.descendantFileCount += child.descendantFileCount;
    }
  }

  return directories;
}

function scoreFileDirectMatch(file, terms, fullQuery) {
  const path = (file.path || "").toLowerCase();
  const name = basename(file.path || "").toLowerCase();
  const segments = splitSegments(file.path || "").map((segment) => segment.toLowerCase());
  const symbolNames = [
    ...(file.functions || []).map((item) => item.name),
    ...(file.classes || []).map((item) => item.name),
    ...(file.methods || []).map((item) => item.name),
  ].filter(Boolean);
  const symbolText = symbolNames.join(" ").toLowerCase();
  const metadata = [
    file.summary,
    file.why,
    ...(file.imports || []),
    ...(file.selectors || []),
    ...(file.topLevelKeys || []),
    ...(file.headings || []),
    ...(file.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  const reasons = [];

  if (fullQuery && path.includes(fullQuery)) {
    score += 4;
    reasons.push(`path matches \`${fullQuery}\``);
  }

  for (const term of terms) {
    if (name === term) {
      score += 9;
      reasons.push(`filename equals \`${term}\``);
      continue;
    }
    if (segments.includes(term)) {
      score += 7;
      reasons.push(`path segment matches \`${term}\``);
      continue;
    }
    if (path.includes(term)) {
      score += 5;
      reasons.push(`path contains \`${term}\``);
    }
    if (new RegExp(`\\b${term}\\b`).test(symbolText)) {
      score += 5;
      reasons.push(`symbol matches \`${term}\``);
      continue;
    }
    if (symbolText.includes(term)) {
      score += 4;
      reasons.push(`symbol contains \`${term}\``);
    }
    if (metadata.includes(term)) {
      score += 2;
      reasons.push(`metadata mentions \`${term}\``);
    }
  }

  return { score, reasons: unique(reasons).slice(0, 6) };
}

function scoreSymbolDirectMatch(symbol, terms, fullQuery) {
  const name = (symbol.name || "").toLowerCase();
  const file = (symbol.file || "").toLowerCase();
  let score = 0;
  const reasons = [];

  if (fullQuery && name.includes(fullQuery)) {
    score += 4;
    reasons.push(`symbol contains \`${fullQuery}\``);
  }

  for (const term of terms) {
    if (name === term) {
      score += 9;
      reasons.push(`symbol equals \`${term}\``);
      continue;
    }
    if (name.includes(term)) {
      score += 6;
      reasons.push(`symbol contains \`${term}\``);
    }
    if (file.includes(term)) {
      score += 2;
      reasons.push(`file path contains \`${term}\``);
    }
  }

  return { score, reasons: unique(reasons).slice(0, 6) };
}

function extractFolderTerms(terms, query) {
  const rawParts = query
    .split(/\s+/)
    .map((part) => normalizePath(part.replace(/[`"'(),:;]+/g, "")))
    .filter(Boolean);

  return unique([
    ...terms.filter((term) => term.includes("/")),
    ...rawParts.filter((part) => part.includes("/")),
  ]);
}

function buildAdjacency(edges = []) {
  const outgoing = new Map();
  const incoming = new Map();

  const attach = (map, key, value) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(value);
  };

  for (const edge of edges) {
    if (!edge?.from || !edge?.to) continue;
    attach(outgoing, edge.from, edge.to);
    attach(incoming, edge.to, edge.from);
  }

  return { outgoing, incoming };
}

function resolveImportSpecifier(fromPath, specifier, pathSet) {
  if (!specifier) return null;

  const trimmed = specifier.trim();
  const directCandidates = [];

  if (trimmed.startsWith(".")) {
    directCandidates.push(joinPath(dirname(fromPath), trimmed));
  } else if (trimmed.startsWith("@/") || trimmed.startsWith("~/")) {
    directCandidates.push(joinPath("src", trimmed.slice(2)));
  } else if (trimmed.startsWith("src/") || trimmed.startsWith("app/")) {
    directCandidates.push(normalizePath(trimmed));
  } else {
    return null;
  }

  for (const candidate of directCandidates) {
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

function buildDirectoryIndexPayload(directories) {
  return [...directories.values()]
    .map((directory) => ({
      path: directory.path,
      parent: directory.parent,
      depth: directory.depth,
      fileCount: directory.fileCount,
      descendantFileCount: directory.descendantFileCount,
      children: [...directory.children].sort(),
      files: [...directory.files].sort().slice(0, 80),
    }))
    .sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path));
}

export function extractQueryTerms(query = "") {
  const lowered = query.toLowerCase().trim();
  if (!lowered) return [];

  const raw = lowered
    .split(/[^a-z0-9_./@-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && !STOP_WORDS.has(part));

  // Basic stemming: add root forms for common suffixes
  // "streaming" → also search "stream", "authentication" → "auth", etc.
  const stemmed = [];
  for (const term of raw) {
    stemmed.push(term);
    // Strip common suffixes to find root
    const root = term
      .replace(/(?:ing|tion|ation|ment|ness|able|ible|ous|ive|ful|less|er|or|ist|ize|ise)$/, '');
    if (root.length >= 3 && root !== term) {
      stemmed.push(root);
    }
    // Also handle "streaming" → "stream" (strip just "ing" when root is valid)
    if (term.endsWith('ing') && term.length > 5) {
      const noIng = term.slice(0, -3);
      if (noIng.length >= 3 && noIng !== root) stemmed.push(noIng);
    }
  }

  return unique(stemmed).slice(0, 20);
}

export function buildCodebaseIndex({
  fileTree = [],
  files = [],
  symbolIndex = [],
  dependencyGraph = [],
  callGraph = [],
} = {}) {
  const knownPaths = unique([
    ...fileTree.filter((entry) => entry?.type === "blob").map((entry) => normalizePath(entry.path)),
    ...files.map((file) => normalizePath(file.path)),
  ]);
  const pathSet = new Set(knownPaths);
  const directories = createDirectoryMap(knownPaths);
  const symbolOwners = new Map();

  for (const symbol of symbolIndex || []) {
    if (!symbol?.file || !symbol?.name) continue;
    const filePath = normalizePath(symbol.file);
    if (!symbolOwners.has(filePath)) symbolOwners.set(filePath, []);
    symbolOwners.get(filePath).push(symbol.name);
  }

  const resolvedDependencyGraph = [];
  const unresolvedImports = [];
  for (const edge of dependencyGraph || []) {
    if (!edge?.from || !edge?.to) continue;
    const fromPath = normalizePath(edge.from);
    const resolved = resolveImportSpecifier(fromPath, edge.to, pathSet);
    if (resolved) {
      resolvedDependencyGraph.push({
        from: fromPath,
        to: resolved,
        via: edge.to,
        kind: "import",
      });
    } else if (edge.to.startsWith(".") || edge.to.startsWith("@/") || edge.to.startsWith("~/") || edge.to.startsWith("src/")) {
      unresolvedImports.push({
        from: fromPath,
        specifier: edge.to,
      });
    }
  }

  const fileCallGraph = dedupeEdges(
    (callGraph || [])
      .map((edge) => {
        const from = normalizePath(parseFileRef(edge.from));
        const to = normalizePath(parseFileRef(edge.to));
        if (!from || !to || !pathSet.has(from) || !pathSet.has(to) || from === to) return null;
        return { from, to, kind: "call" };
      })
      .filter(Boolean),
  );

  const allEdges = dedupeEdges([
    ...resolvedDependencyGraph.map((edge) => ({ from: edge.from, to: edge.to })),
    ...fileCallGraph.map((edge) => ({ from: edge.from, to: edge.to })),
  ]);
  const adjacency = buildAdjacency(allEdges);

  const fileNodes = knownPaths.map((path) => {
    const directory = dirname(path);
    const imports = resolvedDependencyGraph.filter((edge) => edge.from === path).map((edge) => edge.to);
    const importers = resolvedDependencyGraph.filter((edge) => edge.to === path).map((edge) => edge.from);
    const calls = fileCallGraph.filter((edge) => edge.from === path).map((edge) => edge.to);
    const calledBy = fileCallGraph.filter((edge) => edge.to === path).map((edge) => edge.from);

    return {
      path,
      directory,
      depth: splitSegments(path).length,
      extension: extname(path),
      symbols: unique(symbolOwners.get(path) || []).slice(0, 40),
      imports: unique(imports),
      importedBy: unique(importers),
      calls: unique(calls),
      calledBy: unique(calledBy),
    };
  });

  const rankedAnchors = fileNodes
    .map((node) => ({
      path: node.path,
      score: node.imports.length + node.importedBy.length + node.calls.length + node.calledBy.length + (node.symbols.length ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 12);

  return {
    strategy: "hybrid-tree-graph",
    builtAt: new Date().toISOString(),
    summary: {
      fileCount: knownPaths.length,
      directoryCount: directories.size - 1,
      dependencyEdges: resolvedDependencyGraph.length,
      unresolvedImports: unresolvedImports.length,
      callEdges: fileCallGraph.length,
      topTraversalAnchors: rankedAnchors,
    },
    directories: buildDirectoryIndexPayload(directories),
    fileNodes,
    dependencyGraph: resolvedDependencyGraph,
    fileCallGraph,
    unresolvedImports,
    queryPhases: [
      "Seed relevant files and symbols from path, metadata, and symbol matches.",
      "Expand through the directory tree to pull in siblings, descendants, and parent context.",
      "Traverse dependency and call edges with bounded graph walks to surface connected modules.",
      "Blend direct relevance, tree locality, and graph reachability into one ranked result set.",
    ],
    graphStats: {
      maxOutgoingDegree: Math.max(0, ...fileNodes.map((node) => node.imports.length + node.calls.length)),
      maxIncomingDegree: Math.max(0, ...fileNodes.map((node) => node.importedBy.length + node.calledBy.length)),
      connectedNodes: new Set([
        ...allEdges.map((edge) => edge.from),
        ...allEdges.map((edge) => edge.to),
      ]).size,
    },
    treeStats: {
      deepestPathDepth: Math.max(0, ...fileNodes.map((node) => node.depth)),
      widestDirectories: buildDirectoryIndexPayload(directories)
        .map((directory) => ({
          path: directory.path || "/",
          fileCount: directory.fileCount,
          descendantFileCount: directory.descendantFileCount,
        }))
        .sort((a, b) => b.descendantFileCount - a.descendantFileCount || a.path.localeCompare(b.path))
        .slice(0, 10),
    },
    adjacencyPreview: {
      imports: Object.fromEntries(fileNodes.slice(0, 80).map((node) => [node.path, node.imports.slice(0, 10)])),
      callTargets: Object.fromEntries(fileNodes.slice(0, 80).map((node) => [node.path, node.calls.slice(0, 10)])),
    },
    graphTraversalRoots: unique([
      ...fileNodes.filter((node) => node.importedBy.length === 0 && node.imports.length > 0).map((node) => node.path),
      ...fileNodes.filter((node) => /route\.(js|ts)$|page\.(js|jsx|ts|tsx)$|layout\.(js|jsx|ts|tsx)$/.test(node.path)).map((node) => node.path),
    ]).slice(0, 20),
    __runtime: {
      directoryMap: directories,
      adjacency,
    },
  };
}

function buildRuntimeIndex(analysis) {
  const persisted = analysis?.results?.codebaseIndex;
  if (persisted?.__runtime) return persisted;

  const index = buildCodebaseIndex({
    fileTree: analysis?.file_tree || analysis?.fileTree || [],
    files: analysis?.results?.files || [],
    symbolIndex: analysis?.results?.symbolIndex || [],
    dependencyGraph: analysis?.results?.rawDependencyGraph || analysis?.results?.dependencyGraph || [],
    callGraph: analysis?.results?.callGraph || [],
  });
  return persisted ? { ...index, ...persisted, __runtime: index.__runtime } : index;
}

function addScore(scoreMap, reasonMap, key, delta, reason) {
  if (!key || (!delta && !reason)) return;
  if (delta) {
    scoreMap.set(key, (scoreMap.get(key) || 0) + delta);
  }
  if (reason) {
    if (!reasonMap.has(key)) reasonMap.set(key, new Set());
    reasonMap.get(key).add(reason);
  }
}

function buildFolderMatches(index, terms, query) {
  const folderTerms = extractFolderTerms(terms, query);
  const matches = [];

  for (const directory of index.directories || []) {
    const path = directory.path || "/";
    const lowered = path.toLowerCase();
    let score = 0;
    const reasons = [];
    for (const term of folderTerms) {
      const normalizedTerm = normalizePath(term).toLowerCase();
      if (!normalizedTerm) continue;
      if (lowered === normalizedTerm) {
        score += 10;
        reasons.push(`folder equals \`${normalizedTerm}\``);
      } else if (lowered.startsWith(`${normalizedTerm}/`) || lowered.includes(normalizedTerm)) {
        score += 6;
        reasons.push(`folder contains \`${normalizedTerm}\``);
      }
    }
    if (score > 0) {
      matches.push({
        path,
        score,
        fileCount: directory.fileCount,
        descendantFileCount: directory.descendantFileCount,
        reasons: unique(reasons).slice(0, 4),
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, 8);
}

function expandThroughTree(index, folderMatches, fileScores, reasonMap) {
  const treeScores = new Map();
  const directories = index.__runtime.directoryMap;

  for (const folder of folderMatches) {
    const directory = directories.get(folder.path === "/" ? "" : folder.path);
    if (!directory) continue;

    const files = [...directory.files].slice(0, 20);
    for (const path of files) {
      addScore(treeScores, reasonMap, path, 4 + folder.score * 0.2, `lives in matched folder \`${folder.path}\``);
    }

    for (const childPath of [...directory.children].slice(0, 12)) {
      const child = directories.get(childPath);
      if (!child) continue;
      for (const filePath of [...child.files].slice(0, 12)) {
        addScore(treeScores, reasonMap, filePath, 3.5 + folder.score * 0.15, `descends from matched folder \`${folder.path}\``);
      }
    }
  }

  for (const [path, score] of fileScores.entries()) {
    const directory = directories.get(dirname(path));
    if (!directory) continue;

    for (const sibling of [...directory.files].slice(0, 12)) {
      if (sibling === path) continue;
      addScore(treeScores, reasonMap, sibling, score * 0.22, `sibling of \`${path}\``);
    }

    let currentPath = directory.path;
    let depth = 0;
    while (currentPath !== null && depth < 3) {
      const current = directories.get(currentPath);
      if (!current) break;
      addScore(treeScores, reasonMap, path, Math.max(0.5, score * (0.1 / (depth + 1))), `anchored under \`${current.path || "/"}\``);
      currentPath = current.parent;
      depth += 1;
      if (currentPath === undefined) break;
    }
  }

  return treeScores;
}

function expandThroughGraph(index, seedScores, reasonMap, maxDepth = 2) {
  const graphScores = new Map();
  const { outgoing, incoming } = index.__runtime.adjacency;
  const queue = [...seedScores.entries()].map(([path, score]) => ({ path, score, depth: 0 }));
  const bestSeen = new Map();
  let explored = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current?.path || current.depth >= maxDepth) continue;
    explored += 1;

    const forward = [...(outgoing.get(current.path) || [])].map((target) => ({
      target,
      weight: 0.78,
      reason: `reachable from \`${current.path}\``,
    }));
    const reverse = [...(incoming.get(current.path) || [])].map((target) => ({
      target,
      weight: 0.88,
      reason: `imports or calls into \`${current.path}\``,
    }));

    for (const neighbor of [...forward, ...reverse]) {
      const propagated = current.score * neighbor.weight / (current.depth + 1.15);
      if (propagated < 1.2) continue;

      addScore(graphScores, reasonMap, neighbor.target, propagated, neighbor.reason);
      const nextDepth = current.depth + 1;
      const seenScore = bestSeen.get(neighbor.target) || 0;
      if (propagated > seenScore) {
        bestSeen.set(neighbor.target, propagated);
        queue.push({ path: neighbor.target, score: propagated, depth: nextDepth });
      }
    }
  }

  return { graphScores, explored };
}

function findShortestPath(index, fromPath, toPath, maxDepth = 5) {
  if (!fromPath || !toPath || fromPath === toPath) return null;

  const { outgoing, incoming } = index.__runtime.adjacency;
  const visited = new Set([fromPath]);
  const queue = [{ path: fromPath, hops: [fromPath] }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.hops.length > maxDepth + 1) continue;

    const neighbors = unique([
      ...(outgoing.get(current.path) || []),
      ...(incoming.get(current.path) || []),
    ]);

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      const nextHops = [...current.hops, neighbor];
      if (neighbor === toPath) return nextHops;
      visited.add(neighbor);
      queue.push({ path: neighbor, hops: nextHops });
    }
  }

  return null;
}

export function buildTraversalArchitecture(codebaseIndex) {
  return {
    strategy: "Hybrid directory tree plus dependency graph traversal",
    phases: codebaseIndex?.queryPhases || [],
    summary: `Indexes ${codebaseIndex?.summary?.fileCount || 0} files across ${codebaseIndex?.summary?.directoryCount || 0} directories, then blends tree locality with ${codebaseIndex?.summary?.dependencyEdges || 0} dependency edges and ${codebaseIndex?.summary?.callEdges || 0} call edges.`,
    strengths: [
      "Fast folder-scoped exploration through hierarchical directory expansion.",
      "Cross-module discovery through resolved imports and file-level call traversal.",
      "Bounded graph walks that keep query context focused instead of flooding the prompt.",
    ],
  };
}

export function queryCodebase(analysis, query, options = {}) {
  const index = buildRuntimeIndex(analysis);
  const files = analysis?.results?.files || [];
  const symbols = analysis?.results?.symbolIndex || [];
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const terms = extractQueryTerms(query);
  const loweredQuery = query.toLowerCase().trim();
  const directFileScores = new Map();
  const symbolScores = [];
  const reasonMap = new Map();

  for (const file of files) {
    const { score, reasons } = scoreFileDirectMatch(file, terms, loweredQuery);
    if (score > 0) {
      addScore(directFileScores, reasonMap, file.path, score, reasons[0]);
      for (const reason of reasons.slice(1)) addScore(directFileScores, reasonMap, file.path, 0, reason);
    }
  }

  for (const symbol of symbols) {
    const { score, reasons } = scoreSymbolDirectMatch(symbol, terms, loweredQuery);
    if (score <= 0) continue;
    symbolScores.push({
      ...symbol,
      score,
      reasons,
    });
    if (symbol.file) {
      addScore(directFileScores, reasonMap, symbol.file, Math.max(3, score * 0.55), `owns relevant symbol \`${symbol.name}\``);
    }
  }

  const folderMatches = buildFolderMatches(index, terms, query);

  // ── Hub/Entry file boosting ──
  // Files imported by many others are architecturally important — boost them
  // when they have ANY relevance (even partial match)
  const fileNodes = index.fileNodes || [];
  for (const node of fileNodes) {
    const inDegree = (node.importedBy?.length || 0) + (node.calledBy?.length || 0);
    const isEntryPoint = /\b(index|main|app|server|route|page|layout)\b/i.test(basename(node.path));
    const isConfig = /\b(config|env|settings|constants)\b/i.test(basename(node.path));

    // Only boost files that already have some relevance (avoid noise)
    const currentScore = directFileScores.get(node.path) || 0;
    if (currentScore <= 0) continue;

    // Hub boost: files imported by 3+ others get a bonus proportional to their connectivity
    if (inDegree >= 3) {
      const hubBoost = Math.min(4, inDegree * 0.5);
      addScore(directFileScores, reasonMap, node.path, hubBoost, `hub file (imported by ${inDegree} others)`);
    }

    // Entry point boost
    if (isEntryPoint) {
      addScore(directFileScores, reasonMap, node.path, 2, 'entry point file');
    }

    // Config file boost (defines architecture)
    if (isConfig) {
      addScore(directFileScores, reasonMap, node.path, 1.5, 'configuration file');
    }
  }

  const treeScores = expandThroughTree(index, folderMatches, directFileScores, reasonMap);
  const graphSeedScores = new Map([...directFileScores.entries()].filter(([, score]) => score >= 4));
  const { graphScores, explored } = expandThroughGraph(index, graphSeedScores, reasonMap, options.maxGraphDepth || 2);

  const finalScores = new Map();
  for (const path of new Set([
    ...directFileScores.keys(),
    ...treeScores.keys(),
    ...graphScores.keys(),
  ])) {
    const total = (directFileScores.get(path) || 0) * 1.45 + (treeScores.get(path) || 0) + (graphScores.get(path) || 0);
    if (total > 0) finalScores.set(path, Number(total.toFixed(3)));
  }

  const rankedFiles = sortByScoreDescending(
    [...finalScores.entries()]
      .map(([path, score]) => {
        const file = fileByPath.get(path);
        if (!file) return null;
        return {
          path,
          score,
          summary: file.summary,
          why: file.why,
          language: file.language,
          directScore: Number((directFileScores.get(path) || 0).toFixed(3)),
          treeScore: Number((treeScores.get(path) || 0).toFixed(3)),
          graphScore: Number((graphScores.get(path) || 0).toFixed(3)),
          reasons: unique([...(reasonMap.get(path) || [])]).slice(0, 4),
        };
      })
      .filter(Boolean),
  );

  const topFileMatches = rankedFiles.slice(0, options.maxFiles || 8);
  const topSymbolMatches = symbolScores
    .sort((a, b) => b.score - a.score || (a.file || "").localeCompare(b.file || ""))
    .slice(0, options.maxSymbols || 10)
    .map((symbol) => ({
      name: symbol.name,
      file: symbol.file,
      type: symbol.type || symbol.kind,
      score: symbol.score,
      reasons: symbol.reasons,
    }));

  const seedFiles = [...directFileScores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([path]) => path);

  const traversalPath = seedFiles.length > 0 && topFileMatches.length > 0
    ? findShortestPath(index, seedFiles[0], topFileMatches[0].path)
    : null;

  return {
    strategy: index.strategy,
    terms,
    fileMatches: topFileMatches,
    symbolMatches: topSymbolMatches,
    folderMatches,
    traversal: {
      queryPhases: index.queryPhases,
      seedFiles,
      seedFolders: folderMatches.map((folder) => folder.path),
      exploredFiles: explored,
      graphHops: options.maxGraphDepth || 2,
      path: traversalPath,
    },
  };
}
