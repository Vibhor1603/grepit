import { createHash } from "crypto";

function sha(text) {
  return createHash("sha1").update(text).digest("hex");
}

function ext(path) {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function detectLanguage(path) {
  const extension = ext(path);
  const map = {
    ".css": "css",
    ".go": "go",
    ".html": "html",
    ".htm": "html",
    ".java": "java",
    ".js": "javascript",
    ".json": "json",
    ".jsx": "javascript",
    ".less": "css",
    ".md": "markdown",
    ".mdx": "markdown",
    ".mjs": "javascript",
    ".py": "python",
    ".rb": "ruby",
    ".rs": "rust",
    ".sass": "css",
    ".scss": "css",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".yaml": "yaml",
    ".yml": "yaml",
  };
  return map[extension] || "generic";
}

function lineCount(content) {
  return content.split("\n").length;
}

function normalizeBody(body) {
  return body.replace(/\s+/g, " ").trim();
}

function extractMatches(regex, content, mapper) {
  const items = [];
  for (const match of content.matchAll(regex)) {
    items.push(mapper(match));
  }
  return items;
}

function dedupeNamedItems(items) {
  const seen = new Map();
  for (const item of items) {
    if (!item?.name) continue;
    if (!seen.has(item.name)) {
      seen.set(item.name, item);
      continue;
    }
    const previous = seen.get(item.name);
    seen.set(item.name, {
      ...previous,
      ...item,
      args: previous.args || item.args,
    });
  }
  return [...seen.values()];
}

function parseJavascript(content, path) {
  const functions = dedupeNamedItems([
    ...extractMatches(/export\s+default\s+async\s+function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g, content, (m) => ({ name: m[1], kind: "function", args: m[2] })),
    ...extractMatches(/export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g, content, (m) => ({ name: m[1], kind: "function", args: m[2] })),
    ...extractMatches(/export\s+async\s+function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g, content, (m) => ({ name: m[1], kind: "function", args: m[2] })),
    ...extractMatches(/export\s+function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g, content, (m) => ({ name: m[1], kind: "function", args: m[2] })),
    ...extractMatches(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g, content, (m) => ({ name: m[1], kind: "function", args: m[2] })),
    ...extractMatches(/export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g, content, (m) => ({ name: m[1], kind: "function", args: m[2] })),
    ...extractMatches(/const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g, content, (m) => ({ name: m[1], kind: "function", args: m[2] })),
    ...extractMatches(/export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?function\s*\(([^)]*)\)/g, content, (m) => ({ name: m[1], kind: "function", args: m[2] })),
    ...extractMatches(/const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?function\s*\(([^)]*)\)/g, content, (m) => ({ name: m[1], kind: "function", args: m[2] })),
  ]);
  const classes = dedupeNamedItems(extractMatches(/class\s+([A-Za-z0-9_]+)/g, content, (m) => ({ name: m[1], kind: "class" })));
  const imports = [
    ...extractMatches(/import\s+.+?\s+from\s+["']([^"']+)["']/g, content, (m) => m[1]),
    ...extractMatches(/require\(["']([^"']+)["']\)/g, content, (m) => m[1]),
  ];
  const methods = dedupeNamedItems(extractMatches(/^\s{2,}([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{/gm, content, (m) => ({ name: m[1], kind: "method", args: m[2] }))
    .filter(m => !/^(if|else|for|while|do|switch|catch|finally|try|return|throw|new|delete|typeof|void|with|yield|await|async|class|function|const|let|var|import|export|default|break|continue|debugger|in|of|instanceof|super|this|case)$/.test(m.name)));
  return { functions, classes, imports, methods };
}

function parsePython(content) {
  const functions = extractMatches(/^\s*def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*:/gm, content, (m) => ({ name: m[1], kind: "function", args: m[2] }));
  const classes = extractMatches(/^\s*class\s+([A-Za-z0-9_]+)/gm, content, (m) => ({ name: m[1], kind: "class" }));
  const imports = [
    ...extractMatches(/^\s*from\s+([A-Za-z0-9_\.]+)\s+import/gm, content, (m) => m[1]),
    ...extractMatches(/^\s*import\s+([A-Za-z0-9_\.]+)/gm, content, (m) => m[1]),
  ];
  return { functions, classes, imports, methods: [] };
}

function parseGo(content) {
  const functions = extractMatches(/func\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g, content, (m) => ({ name: m[1], kind: "function", args: m[2] }));
  const methods = extractMatches(/func\s+\([^)]+\)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g, content, (m) => ({ name: m[1], kind: "method", args: m[2] }));
  const classes = extractMatches(/type\s+([A-Za-z0-9_]+)\s+struct/g, content, (m) => ({ name: m[1], kind: "class" }));
  const imports = extractMatches(/"([^"]+)"/g, content, (m) => m[1]);
  return { functions, classes, imports, methods };
}

function parseJava(content) {
  const classes = extractMatches(/class\s+([A-Za-z0-9_]+)/g, content, (m) => ({ name: m[1], kind: "class" }));
  const methods = extractMatches(/(?:public|private|protected)\s+[A-Za-z0-9_<>\[\]]+\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g, content, (m) => ({ name: m[1], kind: "method", args: m[2] }));
  const imports = extractMatches(/import\s+([A-Za-z0-9_\.]+);/g, content, (m) => m[1]);
  return { functions: [], classes, imports, methods };
}

function parseStylesheet(content) {
  const imports = extractMatches(/@import\s+(?:url\()?["']?([^"')\s]+)["']?\)?/g, content, (m) => m[1]);
  const selectors = extractMatches(/(^|\})\s*([^{@][^{]+)\s*\{/g, content, (m) => m[2].trim())
    .flatMap((selector) => selector.split(",").map((item) => item.trim()))
    .filter(Boolean)
    .slice(0, 30);
  const customProperties = extractMatches(/(--[A-Za-z0-9-_]+)\s*:/g, content, (m) => m[1]).slice(0, 30);
  const animations = extractMatches(/@keyframes\s+([A-Za-z0-9-_]+)/g, content, (m) => m[1]).slice(0, 20);
  return { functions: [], classes: [], imports, methods: [], selectors, customProperties, animations, topLevelKeys: [], headings: [], tags: [] };
}

function parseHtml(content) {
  const tags = [...new Set(extractMatches(/<([a-z][a-z0-9-]*)\b/gi, content, (m) => m[1].toLowerCase()))].slice(0, 30);
  return { functions: [], classes: [], imports: [], methods: [], selectors: [], customProperties: [], animations: [], topLevelKeys: [], headings: [], tags };
}

function parseJson(content) {
  try {
    const parsed = JSON.parse(content);
    const topLevelKeys = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed).slice(0, 30) : [];
    return { functions: [], classes: [], imports: [], methods: [], selectors: [], customProperties: [], animations: [], topLevelKeys, headings: [], tags: [] };
  } catch {
    return { functions: [], classes: [], imports: [], methods: [], selectors: [], customProperties: [], animations: [], topLevelKeys: [], headings: [], tags: [] };
  }
}

function parseMarkdown(content) {
  const headings = extractMatches(/^#{1,6}\s+(.+)$/gm, content, (m) => m[1].trim()).slice(0, 30);
  return { functions: [], classes: [], imports: [], methods: [], selectors: [], customProperties: [], animations: [], topLevelKeys: [], headings, tags: [] };
}

function parseYaml(content) {
  const topLevelKeys = extractMatches(/^([A-Za-z0-9_-]+):/gm, content, (m) => m[1]).slice(0, 30);
  return { functions: [], classes: [], imports: [], methods: [], selectors: [], customProperties: [], animations: [], topLevelKeys, headings: [], tags: [] };
}

function parseGeneric(content) {
  return {
    functions: extractMatches(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{/g, content, (m) => ({ name: m[1], kind: "function", args: m[2] }))
      .filter(m => !/^(if|else|for|while|do|switch|catch|finally|try|return|throw|new|delete|typeof|void|with|yield|await|async|class|function|const|let|var|import|export|default|break|continue|debugger|in|of|instanceof|super|this|case)$/.test(m.name))
      .slice(0, 15),
    classes: extractMatches(/\bclass\s+([A-Za-z0-9_]+)/g, content, (m) => ({ name: m[1], kind: "class" })).slice(0, 10),
    imports: [],
    methods: [],
    selectors: [],
    customProperties: [],
    animations: [],
    topLevelKeys: [],
    headings: [],
    tags: [],
  };
}

function parseLanguage(path, content) {
  const language = detectLanguage(path);
  if (language === "javascript" || language === "typescript") return { language, ...parseJavascript(content, path) };
  if (language === "python") return { language, ...parsePython(content) };
  if (language === "go") return { language, ...parseGo(content) };
  if (language === "java") return { language, ...parseJava(content) };
  if (language === "css") return { language, ...parseStylesheet(content) };
  if (language === "html") return { language, ...parseHtml(content) };
  if (language === "json") return { language, ...parseJson(content) };
  if (language === "markdown") return { language, ...parseMarkdown(content) };
  if (language === "yaml") return { language, ...parseYaml(content) };
  return { language, ...parseGeneric(content) };
}

function inferFilePurpose(path, parsed) {
  if (/test|spec/i.test(path)) return "Test file";
  if (parsed.language === "css") return "Stylesheet file";
  if (parsed.language === "html") return "Markup/template file";
  if (parsed.language === "json" || parsed.language === "yaml") return "Configuration or data file";
  if (parsed.language === "markdown") return "Documentation file";
  if (/route|controller|api/i.test(path)) return "API or request handling file";
  if (/component|view|page/i.test(path)) return "UI/rendering file";
  if (parsed.classes.length > 0) return "Class-based module";
  if (parsed.functions.length > 0) return "Function-oriented module";
  return "Project source file";
}

function buildFileKind(parsed) {
  if (parsed.language === "css") return "stylesheet";
  if (parsed.language === "html") return "markup";
  if (parsed.language === "json" || parsed.language === "yaml") return "config";
  if (parsed.language === "markdown") return "docs";
  if (parsed.language === "javascript" || parsed.language === "typescript") return "source";
  if (parsed.language === "python" || parsed.language === "go" || parsed.language === "java") return "source";
  return "generic";
}

function buildWhySummary(parsed) {
  if (parsed.language === "css") {
    return `Contains ${parsed.selectors?.length || 0} selectors, ${parsed.customProperties?.length || 0} custom properties, and ${parsed.animations?.length || 0} animations.`;
  }
  if (parsed.language === "html") {
    return `Contains markup with ${parsed.tags?.length || 0} distinct HTML tags.`;
  }
  if (parsed.language === "json" || parsed.language === "yaml") {
    return `Contains ${parsed.topLevelKeys?.length || 0} top-level keys or sections.`;
  }
  if (parsed.language === "markdown") {
    return `Contains ${parsed.headings?.length || 0} documented headings or sections.`;
  }
  return `Contains ${parsed.functions.length + parsed.methods.length} callable symbols and ${parsed.classes.length} classes.`;
}

function findCallNames(content, names) {
  const calls = new Set();
  for (const name of names) {
    if (new RegExp(`\\b${name}\\s*\\(`).test(content)) calls.add(name);
  }
  return [...calls];
}

function detectEndpoints(path, content) {
  const endpoints = [];
  if (/\/api\//.test(path) && /route\.(js|ts)$/.test(path)) {
    const routePath = path.replace(/^src\/app\/api/, "/api").replace(/\/route\.(js|ts)$/, "").replace(/\[(.+?)\]/g, ":$1");
    for (const method of ["GET", "POST", "PUT", "DELETE", "PATCH"]) {
      if (new RegExp(`export\\s+async\\s+function\\s+${method}`).test(content) || new RegExp(`export\\s+function\\s+${method}`).test(content)) {
        endpoints.push({ method, path: routePath || "/api", file: path, description: `${method} handler in route file.` });
      }
    }
  }

  for (const match of content.matchAll(/app\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/gi)) {
    endpoints.push({ method: match[1].toUpperCase(), path: match[2], file: path, description: "Express-style route." });
  }
  for (const match of content.matchAll(/@(Get|Post|Put|Delete|Patch)Mapping\(\s*["']?([^"')]+)?/g)) {
    endpoints.push({ method: match[1].toUpperCase().replace("MAPPING", ""), path: match[2] || "/", file: path, description: "Java annotation-based route." });
  }
  for (const match of content.matchAll(/@(app|router)\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']/gi)) {
    endpoints.push({ method: match[2].toUpperCase(), path: match[3], file: path, description: "Python web route." });
  }
  return endpoints;
}

function inferRequestResponseSchemas(fileAnalysis) {
  const content = fileAnalysis.content;
  const requestShape = [];
  const responseShape = [];

  for (const match of content.matchAll(/const\s+\{([^}]+)\}\s*=\s*await\s+request\.json\(\)/g)) {
    match[1].split(",").map((part) => part.trim()).filter(Boolean).forEach((item) => requestShape.push(item));
  }
  for (const match of content.matchAll(/return\s+NextResponse\.json\(\s*\{([^}]*)\}/g)) {
    match[1].split(",").map((part) => part.split(":")[0].trim()).filter(Boolean).forEach((item) => responseShape.push(item));
  }

  return {
    request: [...new Set(requestShape)].slice(0, 12),
    response: [...new Set(responseShape)].slice(0, 12),
  };
}

export function buildCodeIntelligence(snapshot, previousAnalysis = null) {
  const previousFiles = new Map(((previousAnalysis?.results?.files) || []).map((file) => [file.hash, file]));
  const allNames = [];
  const files = snapshot.textFiles.map((file) => {
    const cached = previousFiles.get(file.hash);
    if (cached) return cached;

    const parsed = parseLanguage(file.path, file.content);
    const symbolNames = [...parsed.functions, ...parsed.classes, ...parsed.methods].map((symbol) => symbol.name);
    allNames.push(...symbolNames);

    const fileAnalysis = {
      path: file.path,
      hash: file.hash,
      ext: file.ext,
      language: parsed.language,
      fileKind: buildFileKind(parsed),
      size: file.size,
      lineCount: lineCount(file.content),
      summary: inferFilePurpose(file.path, parsed),
      why: buildWhySummary(parsed),
      functions: parsed.functions.map((item) => ({
        ...item,
        args: item.args ? item.args.split(",").map((part) => part.trim()).filter(Boolean) : [],
        returns: [],
        usedBy: [],
      })),
      classes: parsed.classes.map((item) => ({
        ...item,
        methods: parsed.methods.filter((method) => method.name !== item.name).map((method) => method.name),
      })),
      methods: parsed.methods.map((item) => ({
        ...item,
        args: item.args ? item.args.split(",").map((part) => part.trim()).filter(Boolean) : [],
      })),
      imports: parsed.imports.slice(0, 25),
      selectors: (parsed.selectors || []).slice(0, 30),
      customProperties: (parsed.customProperties || []).slice(0, 30),
      animations: (parsed.animations || []).slice(0, 20),
      topLevelKeys: (parsed.topLevelKeys || []).slice(0, 30),
      headings: (parsed.headings || []).slice(0, 30),
      tags: (parsed.tags || []).slice(0, 30),
      callNames: [],
      endpoints: detectEndpoints(file.path, file.content),
      schemas: { request: [], response: [] },
      content: file.content,
      normalizedHash: sha(normalizeBody(file.content)),
    };
    fileAnalysis.callNames = findCallNames(file.content, symbolNames);
    fileAnalysis.schemas = inferRequestResponseSchemas(fileAnalysis);
    return fileAnalysis;
  });

  const symbolIndex = new Map();
  for (const file of files) {
    for (const fn of file.functions) symbolIndex.set(fn.name, { ...fn, file: file.path, type: "function" });
    for (const cls of file.classes) symbolIndex.set(cls.name, { ...cls, file: file.path, type: "class" });
    for (const method of file.methods) symbolIndex.set(method.name, { ...method, file: file.path, type: "method" });
  }

  for (const file of files) {
    const content = file.content;
    for (const [name, symbol] of symbolIndex.entries()) {
      if (symbol.file !== file.path && new RegExp(`\\b${name}\\b`).test(content)) {
        const targetList = files.find((entry) => entry.path === symbol.file);
        if (targetList) {
          const fn = targetList.functions.find((entry) => entry.name === name);
          if (fn && !fn.usedBy.includes(file.path)) fn.usedBy.push(file.path);
        }
      }
    }
  }

  const dependencyGraph = files.flatMap((file) =>
    file.imports.map((imp) => ({
      from: file.path,
      to: imp,
    })),
  );

  const callGraph = [];
  for (const file of files) {
    for (const symbol of [...file.functions, ...file.methods]) {
      const bodyNames = findCallNames(file.content, [...symbolIndex.keys()]);
      for (const called of bodyNames) {
        if (called !== symbol.name) {
          const target = symbolIndex.get(called);
          callGraph.push({
            from: `${file.path}#${symbol.name}`,
            to: target ? `${target.file}#${called}` : called,
          });
        }
      }
    }
  }

  const duplicateMap = new Map();
  for (const file of files) {
    if (file.lineCount < 12) continue;
    const list = duplicateMap.get(file.normalizedHash) || [];
    list.push(file.path);
    duplicateMap.set(file.normalizedHash, list);
  }
  const duplicates = [...duplicateMap.values()].filter((group) => group.length > 1).slice(0, 10);

  const coverageFile = files.find((file) => /lcov\.info$/.test(file.path));
  const testOverview = {
    testFiles: files.filter((file) => /(\.test\.|\.spec\.|\/tests?\/)/i.test(file.path)).map((file) => file.path).slice(0, 50),
    coverageDetected: Boolean(coverageFile),
    coverageSource: coverageFile?.path || null,
  };

  const quality = {
    duplicateGroups: duplicates,
    longFiles: files.filter((file) => file.lineCount > 300).slice(0, 20).map((file) => ({ path: file.path, lineCount: file.lineCount })),
    unusedSymbols: [...symbolIndex.values()]
      .filter((symbol) => {
        const owner = files.find((file) => file.path === symbol.file);
        const used = owner?.functions.find((fn) => fn.name === symbol.name)?.usedBy || [];
        return used.length === 0 && !/main|index|default|render|GET|POST|PUT|DELETE|PATCH/.test(symbol.name);
      })
      .slice(0, 30),
    namingIssues: [...symbolIndex.keys()]
      .filter((name) => /[-]/.test(name) || (/[A-Z]/.test(name[0]) && /_/.test(name)))
      .slice(0, 20),
  };

  const security = {
    hardcodedSecrets: files
      .filter((file) => /(api[_-]?key|secret|token|password)/i.test(file.content))
      .slice(0, 20)
      .map((file) => ({ file: file.path, issue: "Potential hardcoded credential string detected." })),
    unsafePatterns: files
      .flatMap((file) => {
        const findings = [];
        if (/dangerouslySetInnerHTML|eval\(/.test(file.content)) findings.push({ file: file.path, issue: "Potential unsafe dynamic execution or raw HTML usage." });
        if (/SELECT\s+\*\s+FROM/i.test(file.content)) findings.push({ file: file.path, issue: "Broad SQL queries may need tighter selection." });
        return findings;
      })
      .slice(0, 20),
  };

  const performance = {
    heavyFiles: files.filter((file) => file.lineCount > 500).slice(0, 20).map((file) => ({ file: file.path, lineCount: file.lineCount })),
    nestedLoopSignals: files.filter((file) => /(for.+for|while.+for|for.+while)/s.test(file.content)).slice(0, 20).map((file) => file.path),
  };

  const reports = {
    generatedAt: new Date().toISOString(),
    shareToken: previousAnalysis?.results?.reports?.shareToken || sha(`${snapshot.repoUrl}:${snapshot.revision}`).slice(0, 16),
  };

  return {
    files: files.map((file) => ({
      ...file,
      code: file.content.slice(0, 40000),
      truncated: file.content.length > 40000,
      content: undefined,
      normalizedHash: undefined,
    })),
    symbolIndex: [...symbolIndex.values()],
    dependencyGraph,
    callGraph,
    quality,
    security,
    performance,
    testing: testOverview,
    reports,
    incremental: {
      revision: snapshot.revision,
      reusedFiles: files.filter((file) => previousFiles.has(file.hash)).length,
      analyzedFiles: files.length,
    },
  };
}
