const LIGHT_MERMAID = {
  background: "#FAF8F2",
  mainBkg: "#F2EFE6",
  primaryColor: "#F2EFE6",
  primaryTextColor: "#1A1A18",
  primaryBorderColor: "#C47A12",
  secondaryColor: "#FAF8F2",
  tertiaryColor: "#E8E4DA",
  lineColor: "#9A9588",
  textColor: "#1A1A18",
  nodeBorder: "#C47A12",
  nodeTextColor: "#1A1A18",
  clusterBkg: "#FAF8F2",
  clusterBorder: "#D4CFC4",
  titleColor: "#1A1A18",
  edgeLabelBackground: "#FAF8F2",
  labelTextColor: "#1A1A18",
  actorTextColor: "#1A1A18",
  signalTextColor: "#1A1A18",
  noteBkgColor: "#F2EFE6",
  noteTextColor: "#1A1A18",
  activationBorderColor: "#C47A12",
  sequenceNumberColor: "#FAF8F2",
  sectionBkgColor: "#F2EFE6",
  altSectionBkgColor: "#FAF8F2",
  taskBorderColor: "#C47A12",
  taskBkgColor: "#F2EFE6",
  gridColor: "#D4CFC4",
  doneTaskBorderColor: "#5BAF78",
  doneTaskBkgColor: "#EEF5F0",
  fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "14px",
};

const DARK_MERMAID = {
  background: "#111113",
  mainBkg: "#222225",
  primaryColor: "#222225",
  primaryTextColor: "#ECECEE",
  primaryBorderColor: "#EEC679",
  secondaryColor: "#18181B",
  tertiaryColor: "#2A2A2E",
  lineColor: "#52525B",
  textColor: "#ECECEE",
  nodeBorder: "#EEC679",
  nodeTextColor: "#ECECEE",
  clusterBkg: "#18181B",
  clusterBorder: "#3F3F46",
  titleColor: "#ECECEE",
  edgeLabelBackground: "#18181B",
  labelTextColor: "#ECECEE",
  actorTextColor: "#ECECEE",
  signalTextColor: "#ECECEE",
  noteBkgColor: "#222225",
  noteTextColor: "#ECECEE",
  activationBorderColor: "#EEC679",
  sequenceNumberColor: "#111113",
  sectionBkgColor: "#222225",
  altSectionBkgColor: "#18181B",
  taskBorderColor: "#EEC679",
  taskBkgColor: "#222225",
  gridColor: "#3F3F46",
  doneTaskBorderColor: "#6BC48A",
  doneTaskBkgColor: "#1A2A1F",
  fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "14px",
};

export function isDarkTheme() {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

export function getMermaidThemeVariables() {
  return isDarkTheme() ? DARK_MERMAID : LIGHT_MERMAID;
}

/** Mermaid diagram type starters — first non-empty line. */
const DIAGRAM_STARTERS = [
  /^graph\s/i,
  /^flowchart\s/i,
  /^sequencediagram/i,
  /^classdiagram/i,
  /^statediagram/i,
  /^erdiagram/i,
  /^gantt/i,
  /^pie(\s|$)/i,
  /^gitgraph/i,
  /^journey/i,
  /^timeline/i,
  /^mindmap/i,
  /^quadrantchart/i,
  /^requirementdiagram/i,
  /^c4context/i,
  /^c4container/i,
  /^c4component/i,
  /^c4dynamic/i,
  /^c4deployment/i,
  /^sankey/i,
  /^xychart/i,
  /^block/i,
  /^kanban/i,
  /^architecture/i,
  /^packet/i,
  /^zenuml/i,
];

export function looksLikeMermaid(code, lang = "") {
  const normalizedLang = String(lang || "").trim().toLowerCase();
  if (normalizedLang === "mermaid") return true;
  const first = String(code || "")
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  if (!first) return false;
  return DIAGRAM_STARTERS.some((re) => re.test(first));
}

export function sanitizeMermaidCode(raw) {
  const code = String(raw || "").trim();
  if (!code) return "";

  const firstLine = code.split("\n")[0].trim().toLowerCase();
  const isClassDiagram = firstLine.startsWith("classdiagram");
  const lines = code.split("\n");

  const cleanLabels = (text) =>
    text
      .replace(/\|>/g, "|")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\["([^"]*?)"\]/g, (_, label) => {
        const clean = label.replace(/[./\\<>(){}]/g, " ").replace(/\s+/g, " ").trim();
        return `["${clean}"]`;
      })
      .replace(/\|"([^"]*?)"\|/g, (_, label) => {
        const clean = label.replace(/[/\\<>(){}]/g, " ").replace(/\s+/g, " ").trim();
        return `|"${clean}"|`;
      })
      .replace(/-->\|([^"|][^|]*)\|/g, (match, label) => {
        if (/[/\\.<>(){}]/.test(label)) {
          const clean = label.replace(/[/\\<>(){}]/g, " ").replace(/\s+/g, " ").trim();
          return `-->|"${clean}"|`;
        }
        return match;
      });

  if (isClassDiagram) {
    return cleanLabels(lines.join("\n"));
  }

  const isSequenceDiagram = firstLine.startsWith("sequencediagram");

  const classLines = [];
  const otherLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("classDef ") || /^class\s+[\w,]+\s/.test(trimmed)) {
      classLines.push(trimmed);
    } else {
      otherLines.push(line);
    }
  }

  if (isSequenceDiagram) {
    return sanitizeSequenceDiagram(lines.join("\n"));
  }

  return cleanLabels([...otherLines, ...classLines].join("\n"));
}

/** Sequence-diagram arrows (incl. single -> / --> variants models often emit). */
const SEQ_ARROW_RE =
  /(?:->>|-->>|->|-->|--|-\)|\)-|--x|-x-|x--|-\->|<<->>|<<-->>|xx)/i;

function normalizeSequenceMessageText(raw) {
  let msg = String(raw || "")
    .trim()
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/["']/g, "'")
    .replace(/'+/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  msg = msg.replace(/^['"]+|['"]+$/g, "");
  return msg.trim();
}

function quoteSequenceMessage(raw) {
  const msg = normalizeSequenceMessageText(raw);
  if (!msg) return msg;
  return `"${msg.replace(/"/g, "'")}"`;
}

function isSequenceMessageLine(text) {
  if (/^note\b/i.test(text)) return true;
  const colonIdx = text.indexOf(":");
  if (colonIdx === -1) return false;
  const before = text.slice(0, colonIdx);
  return SEQ_ARROW_RE.test(before);
}

/** Split AI-generated `…message… end` onto two lines before other fixes. */
function splitInlineEnd(stripped) {
  if (/^end\s*$/i.test(stripped)) {
    return { body: stripped, trailingEnd: false };
  }
  const match = stripped.match(/^(.+?)\s+end\s*$/i);
  if (!match) {
    return { body: stripped, trailingEnd: false };
  }
  return { body: match[1].trim(), trailingEnd: true };
}

function processSequenceContent(stripped) {
  const blockDesc = stripped.match(
    /^((?:alt|else|opt|loop|par|rect|critical|break)\s+)(.+)$/i
  );
  if (blockDesc) {
    return blockDesc[1] + quoteSequenceMessage(blockDesc[2]);
  }

  const noteMatch = stripped.match(
    /^([Nn]ote\s+(?:over|right of|left of)\s+[^:]+:\s*)(.+)$/
  );
  if (noteMatch) {
    return noteMatch[1] + quoteSequenceMessage(noteMatch[2]);
  }

  const colonIdx = stripped.indexOf(":");
  if (colonIdx > -1) {
    const before = stripped.slice(0, colonIdx).trimEnd();
    const after = stripped.slice(colonIdx + 1);
    if (isSequenceMessageLine(`${before}:${after}`)) {
      return `${before}: ${quoteSequenceMessage(after)}`;
    }
  }

  return stripped;
}

function sanitizeSequenceLine(line) {
  const indent = line.match(/^\s*/)?.[0] || "";
  const content = line.slice(indent.length);
  const stripped = content.replace(/^\d+\.\s+/, "");

  const { body, trailingEnd } = splitInlineEnd(stripped);
  const processed = processSequenceContent(body);

  if (trailingEnd) {
    return [`${indent}${processed}`, `${indent}end`];
  }
  return `${indent}${processed}`;
}

function sanitizeSequenceDiagram(code) {
  const lines = code.split("\n");
  const out = [];
  for (const line of lines) {
    const parts = sanitizeSequenceLine(line);
    if (Array.isArray(parts)) out.push(...parts);
    else out.push(parts);
  }
  return out.join("\n");
}

export function injectDiagramStyles(svg) {
  const dark = isDarkTheme();
  const text = dark ? "#ECECEE" : "#1A1A18";
  const nodeFill = dark ? "#222225" : "#F2EFE6";
  const nodeStroke = dark ? "#EEC679" : "#C47A12";
  const edgeStroke = dark ? "#52525B" : "#9A9588";
  const labelBg = dark ? "#18181B" : "#FAF8F2";

  return svg.replace(/<svg([^>]*)>/, `<svg$1><style>
    text, tspan { fill: ${text} !important; }
    .nodeLabel, .edgeLabel, .label, .labelText { color: ${text} !important; fill: ${text} !important; }
    foreignObject div, foreignObject span, foreignObject p { color: ${text} !important; }
    .node rect, .node polygon, .node circle { fill: ${nodeFill} !important; stroke: ${nodeStroke} !important; }
    .edgePath path, .flowchart-link { stroke: ${edgeStroke} !important; }
    .edgeLabel rect { fill: ${labelBg} !important; }
  </style>`);
}

export function sanitizeSvgHtml(svg) {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

let mermaidInstance = null;
let mermaidThemeKey = null;

export async function renderMermaidToSvg(code) {
  const mermaid = (await import("mermaid")).default;
  const themeKey = isDarkTheme() ? "dark" : "light";

  if (!mermaidInstance || mermaidThemeKey !== themeKey) {
    mermaid.initialize({
      startOnLoad: false,
      suppressErrors: false,
      logLevel: "error",
      securityLevel: "loose",
      theme: "base",
      themeVariables: getMermaidThemeVariables(),
      flowchart: {
        htmlLabels: true,
        curve: "basis",
        nodeSpacing: 30,
        rankSpacing: 50,
        padding: 15,
      },
    });
    mermaidInstance = mermaid;
    mermaidThemeKey = themeKey;
  }

  const sanitized = sanitizeMermaidCode(code);
  const tempDiv = document.createElement("div");
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.top = "-9999px";
  document.body.appendChild(tempDiv);

  try {
    const id = `mmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await mermaid.parse(sanitized);
    const { svg } = await mermaid.render(id, sanitized, tempDiv);
    if (!svg) throw new Error("Empty SVG");
    return sanitizeSvgHtml(injectDiagramStyles(svg));
  } finally {
    tempDiv.remove();
    setTimeout(() => {
      document.querySelectorAll('body > [id^="d"]:not([class])').forEach((el) => el.remove());
      document.querySelectorAll(".error-icon, .error-text").forEach((el) => el.closest("svg")?.parentElement?.remove());
    }, 100);
  }
}
