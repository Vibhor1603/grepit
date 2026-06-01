"use client";

import { useId } from "react";
import { BOLT_PATH } from "../ViboLogo";

/** Fake dashboard panels for the pipeline scroll section — design-token native. */

export function MockPanelUrl() {
  const phases = [
    { label: "Clone repo", done: true },
    { label: "Index files", done: true, active: true },
    { label: "Build map", done: false },
  ];

  return (
    <div className="h-full flex flex-col justify-center gap-5 px-1">
      <div
        className="font-mono text-[12px] md:text-[13px] px-4 py-3 rounded-c-sm border flex items-center gap-3"
        style={{
          borderColor: "var(--c-accent-line)",
          backgroundColor: "var(--c-surface)",
          color: "var(--c-text)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <span className="text-c-text-4 flex-shrink-0">URL</span>
        <span className="truncate">https://github.com/acme/platform</span>
        <span
          className="ml-auto flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-c-xs"
          style={{ backgroundColor: "var(--c-accent)", color: "var(--c-bg)" }}
        >
          Analyze
        </span>
      </div>

      <div className="space-y-2">
        {phases.map((p) => (
          <div
            key={p.label}
            className="flex items-center gap-3 px-3 py-2 rounded-c-sm border"
            style={{
              borderColor: p.active ? "var(--c-accent-line)" : "var(--c-line)",
              backgroundColor: p.active ? "var(--c-accent-soft)" : "var(--c-surface)",
            }}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: p.done ? "var(--c-lime-soft)" : "var(--c-overlay-2)",
                border: `1px solid ${p.done ? "var(--c-lime-line)" : "var(--c-line-2)"}`,
              }}
            >
              {p.done && !p.active ? (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--c-lime)" strokeWidth="3">
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : p.active ? (
                <span className="w-1.5 h-1.5 rounded-full bg-c-accent animate-pulse" />
              ) : null}
            </span>
            <span className={`text-[12px] ${p.active ? "text-c-text font-medium" : "text-c-text-3"}`}>
              {p.label}
            </span>
            {p.active ? (
              <span className="ml-auto font-mono text-[10px] text-c-accent tabular-nums">847 / 1,247</span>
            ) : null}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-c-text-4"
      >
        {[
          { v: "1,247", l: "files" },
          { v: "38", l: "languages" },
          { v: "12", l: "subsystems" },
        ].map((s) => (
          <div
            key={s.l}
            className="px-2 py-2 rounded-c-xs border text-center"
            style={{ borderColor: "var(--c-line)", backgroundColor: "var(--c-surface-2)" }}
          >
            <p className="text-[13px] font-semibold text-c-text tabular-nums normal-case tracking-normal">{s.v}</p>
            <p className="mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const EXPLORER_TREE = [
  { name: "src/", type: "folder", open: true, indent: 0 },
  { name: "app/", type: "folder", open: true, indent: 1 },
  { name: "layout.tsx", type: "file", indent: 2 },
  { name: "middleware.ts", type: "file", indent: 1, selected: true },
  { name: "server/", type: "folder", open: true, indent: 1 },
  { name: "db/", type: "folder", open: false, indent: 2 },
  { name: "api/", type: "folder", open: false, indent: 2 },
  { name: "lib/", type: "folder", open: false, indent: 1 },
];

export function MockPanelExplorer() {
  return (
    <div className="h-full flex flex-col min-h-0">
      <div
        className="flex items-center gap-2 px-3 py-2 border-b font-mono landing-type-label text-c-text-4"
        style={{ borderColor: "var(--c-line)", backgroundColor: "var(--c-surface)" }}
      >
        <span className="text-c-accent truncate">src/middleware.ts</span>
        <span className="ml-auto px-2 py-0.5 rounded-c-xs border border-c-line text-c-text-3 hidden min-[420px]:inline">
          ⌘K search
        </span>
      </div>
      <div
        className="mock-explorer-grid flex-1 grid min-h-0"
        style={{ backgroundColor: "var(--c-line)" }}
      >
        <div className="mock-explorer-sidebar bg-c-surface-2 p-2.5 overflow-hidden">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-c-text-4 mb-2 px-1">Files</p>
          <ul className="space-y-0.5 font-mono text-[10px]">
            {EXPLORER_TREE.map((item) => (
              <li
                key={`${item.indent}-${item.name}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-c-xs truncate"
                style={{
                  paddingLeft: `${item.indent * 12 + 8}px`,
                  color: item.selected ? "var(--c-accent)" : "var(--c-text-2)",
                  backgroundColor: item.selected ? "var(--c-accent-soft)" : "transparent",
                  border: item.selected ? "1px solid var(--c-accent-line)" : "1px solid transparent",
                }}
              >
                {item.type === "folder" ? (
                  <span className="text-c-text-4 w-3">{item.open ? "▾" : "▸"}</span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-c-lime flex-shrink-0" />
                )}
                <span className="truncate">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-c-surface p-3 overflow-hidden font-mono text-[10px] leading-[1.65]">
          <CodeLine n={1}>
            <Kw>import</Kw> {"{ clerkMiddleware, createRouteMatcher }"} <Kw>from</Kw>{" "}
            <Str>"@clerk/nextjs/server"</Str>;
          </CodeLine>
          <CodeLine n={2} />
          <CodeLine n={3}>
            <Kw>const</Kw> isProtected = createRouteMatcher([
          </CodeLine>
          <CodeLine n={4} hl>
            {'  '}
            <Str>"/dashboard(.*)"</Str>, <Str>"/api/protected(.*)"</Str>,
          </CodeLine>
          <CodeLine n={5}>]);</CodeLine>
          <CodeLine n={6} />
          <CodeLine n={7}>
            <Kw>export default</Kw> clerkMiddleware((auth, req) =&gt; {"{"}
          </CodeLine>
          <CodeLine n={8} hl>
            {"  "}
            <Kw>if</Kw> (isProtected(req)) auth().protect();
          </CodeLine>
          <CodeLine n={9}>{"});"}</CodeLine>
        </div>
      </div>
    </div>
  );
}

function CodeLine({ n, hl, children }) {
  return (
    <div
      className="flex gap-3 -mx-1 px-1 rounded-sm"
      style={{ backgroundColor: hl ? "var(--c-accent-soft)" : "transparent" }}
    >
      <span className="w-4 text-right text-c-text-4 tabular-nums flex-shrink-0 select-none">{n}</span>
      <span className="text-c-text-2 min-w-0">{children}</span>
    </div>
  );
}

function Kw({ children }) {
  return <span className="text-c-accent">{children}</span>;
}

function Str({ children }) {
  return <span className="text-c-lime">{children}</span>;
}

const START_HERE = [
  { n: "01", file: "layout.tsx", role: "boot" },
  { n: "02", file: "middleware.ts", role: "auth", active: true },
  { n: "03", file: "schema.ts", role: "data" },
];

const MAP_NODES = [
  { id: "client", x: 52, y: 36, primary: false },
  { id: "edge", x: 148, y: 36, primary: false },
  { id: "api", x: 248, y: 36, primary: true },
  { id: "auth", x: 52, y: 108, primary: false },
  { id: "db", x: 248, y: 108, primary: true },
  { id: "queue", x: 148, y: 108, primary: false },
];

const MAP_EDGES = [
  [0, 1], [1, 2], [0, 3], [3, 2], [2, 4], [2, 5], [5, 4],
];

export function MockPanelMap() {
  const uid = useId().replace(/:/g, "");
  const flowPath = "M 52 36 L 148 36 L 248 36 L 248 108";

  return (
    <div className="h-full grid grid-cols-[112px_1fr] min-h-0">
      <div
        className="border-r p-2.5 flex flex-col gap-1.5"
        style={{ borderColor: "var(--c-line)", backgroundColor: "var(--c-surface)" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-c-accent mb-1">Start here</p>
        {START_HERE.map((s) => (
          <div
            key={s.n}
            className="px-2 py-1.5 rounded-c-xs border"
            style={{
              borderColor: s.active ? "var(--c-lime-line)" : "var(--c-line)",
              backgroundColor: s.active ? "var(--c-lime-soft)" : "transparent",
            }}
          >
            <p className="font-mono text-[9px] text-c-text-4">{s.n}</p>
            <p className="font-mono text-[10px] text-c-text truncate">{s.file}</p>
            <p className="text-[9px] text-c-text-3 mt-0.5">{s.role}</p>
          </div>
        ))}
      </div>

      <div className="relative bg-c-surface-2 min-h-0">
        <svg viewBox="0 0 300 148" className="w-full h-full block" aria-hidden>
          <defs>
            <pattern id={`${uid}-grid`} width="18" height="18" patternUnits="userSpaceOnUse">
              <path d="M 18 0 L 0 0 0 18" fill="none" stroke="var(--c-line)" strokeWidth="0.6" />
            </pattern>
            <linearGradient id={`${uid}-bolt`} x1="14" y1="4" x2="34" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--c-accent-bright)" />
              <stop offset="100%" stopColor="var(--c-accent)" />
            </linearGradient>
          </defs>
          <rect width="300" height="148" fill={`url(#${uid}-grid)`} opacity="0.45" />
          {MAP_EDGES.map(([a, b], i) => {
            const na = MAP_NODES[a];
            const nb = MAP_NODES[b];
            return (
              <line
                key={i}
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
                stroke="var(--c-line-2)"
                strokeWidth="1.25"
              />
            );
          })}
          <path
            id={`${uid}-flow`}
            d={flowPath}
            fill="none"
            stroke="none"
          />
          <path
            d={flowPath}
            fill="none"
            stroke="var(--c-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.55"
            strokeDasharray="8 14"
            className="product-map-flow-line"
          />
          <g transform="scale(0.22) translate(-24, -23)" opacity="0.95">
            <path d={BOLT_PATH} fill={`url(#${uid}-bolt)`} />
            <animateMotion dur="3.2s" repeatCount="indefinite" calcMode="linear" rotate="auto">
              <mpath href={`#${uid}-flow`} />
            </animateMotion>
          </g>
          {MAP_NODES.map((n) => (
            <g key={n.id}>
              <rect
                x={n.x - 28}
                y={n.y - 14}
                width={56}
                height={28}
                rx={7}
                fill="var(--c-surface)"
                stroke={n.primary ? "var(--c-accent-line)" : "var(--c-line-2)"}
                strokeWidth={n.primary ? 1.5 : 1}
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                fontSize="9"
                fill={n.primary ? "var(--c-text)" : "var(--c-text-3)"}
                fontFamily="ui-monospace, monospace"
                fontWeight={n.primary ? 600 : 400}
              >
                {n.id}
              </text>
            </g>
          ))}
        </svg>
        <div
          className="absolute inset-x-0 bottom-0 px-3 py-1.5 border-t font-mono text-[9px] uppercase tracking-[0.1em] text-c-text-4"
          style={{ borderColor: "var(--c-line)", backgroundColor: "color-mix(in srgb, var(--c-surface-2) 94%, transparent)" }}
        >
          Tracing · request → api → database
        </div>
      </div>
    </div>
  );
}

const HEALTH_ISSUES = [
  { severity: "critical", title: "Hardcoded API key", file: "src/lib/api.ts:24" },
  { severity: "warning", title: "Missing input validation", file: "src/routes/user.ts:18" },
  { severity: "warning", title: "No rate limiting on endpoint", file: "src/routes/auth.ts:7" },
];

export function MockPanelHealth() {
  const score = 84;
  const circumference = 2 * Math.PI * 34;

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <div className="flex items-center gap-2 px-0.5">
        <span className="font-mono landing-type-label uppercase tracking-[0.12em] text-c-text-4">
          Health report
        </span>
        <span className="ml-auto font-mono landing-type-label text-c-lime">auto-scan complete</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-[72px] h-[72px] flex-shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90" aria-hidden>
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--c-line)" strokeWidth="6" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="var(--c-lime)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[18px] font-semibold text-c-text tabular-nums leading-none">{score}</span>
            <span className="font-mono text-[8px] uppercase tracking-wider text-c-text-4 mt-0.5">score</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="landing-type-body font-medium text-c-text">Repository health</p>
          <p className="landing-type-caption text-c-text-3 mt-1 leading-[1.45]">
            3 findings · 1 critical · 2 warnings · every issue links to the exact line
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {["secrets", "validation", "auth"].map((tag) => (
              <span
                key={tag}
                className="font-mono landing-type-label px-2 py-0.5 rounded-full border text-c-text-3"
                style={{ borderColor: "var(--c-line)", backgroundColor: "var(--c-overlay-1)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ul className="space-y-2 flex-1 min-h-0 overflow-hidden">
        {HEALTH_ISSUES.map((issue) => (
          <li
            key={issue.file}
            className="flex items-start gap-2.5 px-3 py-2.5 rounded-c-sm border"
            style={{
              borderColor: issue.severity === "critical" ? "var(--c-coral-soft)" : "var(--c-line)",
              backgroundColor: "var(--c-surface)",
            }}
          >
            <span
              className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: issue.severity === "critical" ? "var(--c-coral)" : "var(--c-accent)",
              }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="landing-type-caption font-medium text-c-text">{issue.title}</p>
                <span
                  className="font-mono landing-type-label uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    color: issue.severity === "critical" ? "var(--c-coral)" : "var(--c-accent)",
                    backgroundColor:
                      issue.severity === "critical" ? "var(--c-coral-soft)" : "var(--c-accent-soft)",
                  }}
                >
                  {issue.severity}
                </span>
              </div>
              <p className="font-mono landing-type-label text-c-text-4 mt-0.5 truncate">{issue.file}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MockPanelChat() {
  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <div className="flex items-center gap-2 px-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-c-text-4">Grounded chat</span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] text-c-lime">
          <span className="w-1.5 h-1.5 rounded-full bg-c-lime" />
          indexed
        </span>
      </div>

      <div className="flex justify-end">
        <div
          className="max-w-[88%] px-3.5 py-2.5 rounded-c-sm border rounded-tr-xs text-[12px] text-c-text"
          style={{ backgroundColor: "var(--c-surface)", borderColor: "var(--c-line-2)" }}
        >
          How does route protection work?
        </div>
      </div>

      <div
        className="flex-1 rounded-c-sm border p-3.5 min-h-0 overflow-hidden"
        style={{ backgroundColor: "var(--c-surface)", borderColor: "var(--c-accent-line)", boxShadow: "var(--shadow-1)" }}
      >
        <p className="text-[12px] leading-[1.6] text-c-text-2 mb-3">
          Clerk middleware runs before protected routes. It matches{" "}
          <Cite>src/middleware.ts:4-6</Cite> and calls{" "}
          <code className="font-mono text-[11px] text-c-accent">auth().protect()</code> when the path matches.
        </p>
        <div
          className="rounded-c-xs border p-2.5 font-mono text-[10px] leading-[1.7] mb-3"
          style={{ borderColor: "var(--c-line)", backgroundColor: "var(--c-surface-2)" }}
        >
          <span className="text-c-accent">if</span> (isProtected(req)) auth().protect();
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Show route list", "What about API keys?", "Link to Clerk docs"].map((chip) => (
            <span
              key={chip}
              className="text-[10px] px-2 py-1 rounded-full border text-c-text-3"
              style={{ borderColor: "var(--c-line)", backgroundColor: "var(--c-overlay-1)" }}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Cite({ children }) {
  return (
    <code
      className="font-mono text-[10px] px-1.5 py-0.5 rounded mx-0.5"
      style={{ backgroundColor: "var(--c-accent-soft)", color: "var(--c-accent)" }}
    >
      {children}
    </code>
  );
}

export const MOCK_PANEL_TITLES = [
  "grepit: ingest",
  "grepit: explorer",
  "grepit: architecture",
  "grepit: health",
  "grepit: chat",
];
