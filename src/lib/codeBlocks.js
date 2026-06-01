/** Reserved words — never treat as explainable blocks. */
const SKIP = new Set([
  "export", "default", "async", "public", "private", "protected", "static", "internal",
  "const", "let", "var", "function", "class", "def", "fn", "pub", "struct", "enum", "trait",
  "impl", "interface", "void", "int", "string", "bool", "val", "fun", "module", "abstract",
  "if", "for", "while", "switch", "catch", "return", "else", "try", "finally", "do", "new",
  "typeof", "instanceof", "delete", "throw", "case", "break", "continue", "import", "from",
  "type", "extends", "implements", "yield", "await", "get", "set", "constructor", "namespace",
  "using", "record", "where", "select", "from", "join", "inner", "outer", "left", "right",
]);

const BLOCK_RULES = [
  { kind: "component", re: /^\s*(export\s+)?(default\s+)?function\s+([A-Z]\w*)/ },
  { kind: "component", re: /^\s*(export\s+)?(default\s+)?const\s+([A-Z]\w*)\s*[:=]/ },
  { kind: "hook", re: /^\s*(export\s+)?function\s+(use[A-Z]\w*)/ },
  { kind: "hook", re: /^\s*(export\s+)?const\s+(use[A-Z]\w*)\s*[:=]/ },
  { kind: "function", re: /^\s*(export\s+)?(default\s+)?(async\s+)?function\*?\s+(\w+)/ },
  { kind: "class", re: /^\s*(export\s+)?(default\s+)?(abstract\s+)?class\s+(\w+)/ },
  { kind: "function", re: /^\s*(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(/ },
  { kind: "function", re: /^\s*(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?function/ },
  { kind: "type", re: /^\s*(export\s+)?(type|interface)\s+(\w+)/ },
  { kind: "type", re: /^\s*(export\s+)?enum\s+(\w+)/ },
  { kind: "function", re: /^\s*(async\s+)?def\s+(\w+)/ },
  { kind: "class", re: /^\s*class\s+(\w+)/ },
  { kind: "function", re: /^\s*func\s+(\(.*?\)\s*)?(\w+)/ },
  { kind: "type", re: /^\s*type\s+(\w+)\s+(struct|interface)/ },
  { kind: "function", re: /^\s*(pub\s+)?(async\s+)?fn\s+(\w+)/ },
  { kind: "type", re: /^\s*(pub\s+)?(struct|enum|trait|impl)\s+(\w+)/ },
  {
    kind: "method",
    re: /^\s+(async\s+)?(public|private|protected|static\s+)?(async\s+)?(\w+)\s*(<[^>]+>)?\s*\([^)]*\)\s*\{?\s*$/,
    indent: true,
  },
  {
    kind: "method",
    re: /^\s+(public|private|protected|static\s+)?(async\s+)?function\s+(\w+)\s*\(/,
    indent: true,
  },
  { kind: "function", re: /^\s*(public|private|protected|internal)?\s*(static\s+)?(async\s+)?(class|interface|enum|void|int|string|bool|var|val|fun)\s+(\w+)/ },
  { kind: "function", re: /^\s*(\w+[\s*]+)+(\w+)\s*\([^)]*\)\s*\{?\s*$/ },
  { kind: "function", re: /^\s*(def|class|module)\s+(\w+)/ },
  { kind: "function", re: /^\s*(public|private|protected)?\s*(static\s+)?function\s+(\w+)/ },
  { kind: "class", re: /^\s*(abstract\s+)?class\s+(\w+)/ },
];

function pickName(match) {
  const groups = match.filter(
    (g) => g && /^\w+$/.test(g) && g.length > 1 && !SKIP.has(g),
  );
  return groups[groups.length - 1] || null;
}

/**
 * @returns {Record<number, { name: string, kind: string }>}
 */
export function detectCodeBlocks(lines) {
  const map = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    for (const rule of BLOCK_RULES) {
      if (rule.indent && !/^\s{2,}/.test(line)) continue;
      const match = line.match(rule.re);
      if (!match) continue;
      const name = pickName(match);
      if (!name) continue;
      map[i] = { name, kind: rule.kind };
      break;
    }
  }
  return map;
}

function lineIndent(line) {
  return (line.match(/^\s*/) || [""])[0].length;
}

/** Last line index (inclusive) belonging to a block starting at startIdx. */
export function getBlockEndLine(lines, startIdx, blockStarts = {}, maxSpan = 400) {
  if (!lines.length || startIdx < 0 || startIdx >= lines.length) return startIdx;

  const startIndent = lineIndent(lines[startIdx]);
  let depth = 0;
  let sawOpen = false;

  for (let i = startIdx; i < lines.length && i < startIdx + maxSpan; i++) {
    if (i > startIdx && blockStarts[i] && lineIndent(lines[i]) <= startIndent) {
      return i - 1;
    }

    for (const ch of lines[i]) {
      if (ch === "{") {
        depth++;
        sawOpen = true;
      } else if (ch === "}") {
        depth--;
      }
    }

    if (sawOpen && depth <= 0) return i;
  }

  let end = startIdx;
  for (let i = startIdx + 1; i < lines.length && i < startIdx + maxSpan; i++) {
    if (blockStarts[i] && lineIndent(lines[i]) <= startIndent) break;
    end = i;
  }
  return end;
}

/** @returns {Record<number, { start: number, end: number, name: string, kind: string }>} */
export function buildBlockRanges(lines, blockStarts) {
  const ranges = {};
  for (const startStr of Object.keys(blockStarts)) {
    const start = Number(startStr);
    const end = getBlockEndLine(lines, start, blockStarts);
    ranges[start] = { start, end, name: blockStarts[start].name, kind: blockStarts[start].kind };
  }
  return ranges;
}

/** Maps every line index to its block's start line (if inside a block). */
export function buildLineToBlockStart(ranges) {
  const map = {};
  for (const range of Object.values(ranges)) {
    for (let i = range.start; i <= range.end; i++) map[i] = range.start;
  }
  return map;
}

let measureCanvas;

/** Pixel offset from line start to end of meaningful code (for Explain button placement). */
export function measureCodeEndPx(lineText, fontSize = 12, fontFamily = "ui-monospace, monospace") {
  const trimmed = lineText.replace(/\s+$/, "");
  const leading = lineText.length - lineText.trimStart().length;
  const content = trimmed.slice(leading);
  if (!content) return leading * fontSize * 0.6;

  if (typeof document !== "undefined") {
    if (!measureCanvas) measureCanvas = document.createElement("canvas");
    const ctx = measureCanvas.getContext("2d");
    if (ctx) {
      ctx.font = `${fontSize}px ${fontFamily}`;
      const leadingPx = ctx.measureText(lineText.slice(0, leading)).width;
      const contentPx = ctx.measureText(content).width;
      return leadingPx + contentPx;
    }
  }

  return (lineText.length - (lineText.length - trimmed.length)) * fontSize * 0.6;
}
