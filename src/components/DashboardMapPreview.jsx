"use client";

import { useMemo, useState } from "react";

const TIER_Y = { edge: 48, core: 148, data: 248 };
const VIEW_W = 560;
const VIEW_H = 300;

const LAYER_TIER = {
  Frontend: "edge",
  Documentation: "edge",
  Data: "data",
  API: "core",
  Configuration: "core",
};

function slug(name) {
  return String(name).toLowerCase().replace(/\s+/g, "_");
}

function buildTopology(analysis) {
  const arch = analysis?.architecture || analysis?.results || {};
  const layers = arch.layers || [];
  const deps = arch.dependencies || [];
  const endpoints = (arch.apiEndpoints || []).length;
  const components = (arch.components || []).length;

  if (layers.length === 0) {
    const nodes = [
      { id: "ui", label: "UI", tier: "edge", x: 140, y: TIER_Y.edge, meta: components ? `${components} components` : null },
      { id: "logic", label: "Logic", tier: "core", x: 280, y: TIER_Y.core, meta: endpoints ? `${endpoints} routes` : null },
      { id: "data", label: "Data", tier: "data", x: 420, y: TIER_Y.data, meta: null },
    ];
    return {
      nodes,
      edges: [
        { from: "ui", to: "logic" },
        { from: "logic", to: "data" },
      ],
    };
  }

  const sorted = [...layers].slice(0, 6);
  const byTier = { edge: [], core: [], data: [] };
  for (const layer of sorted) {
    const tier = LAYER_TIER[layer.name] || "core";
    byTier[tier].push(layer);
  }

  const nodes = [];
  for (const tier of ["edge", "core", "data"]) {
    const group = byTier[tier];
    group.forEach((layer, i) => {
      const count = group.length;
      const x = VIEW_W * ((i + 1) / (count + 1));
      const moduleCount = layer.modules?.length ?? 0;
      nodes.push({
        id: slug(layer.name),
        label: layer.name,
        tier,
        x,
        y: TIER_Y[tier],
        meta: moduleCount > 0 ? `${moduleCount} modules` : null,
        file: layer.modules?.[0] || null,
      });
    });
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges =
    deps.length > 0
      ? deps
          .map((d) => ({ from: slug(d.from), to: slug(d.to) }))
          .filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))
      : nodes.slice(0, -1).map((n, i) => ({ from: n.id, to: nodes[i + 1].id }));

  return { nodes, edges };
}

function nodeById(id, nodes) {
  return nodes.find((n) => n.id === id);
}

function edgePath(from, to, nodes) {
  const a = nodeById(from, nodes);
  const b = nodeById(to, nodes);
  if (!a || !b) return "";
  return `M ${a.x} ${a.y + 14} L ${b.x} ${b.y - 14}`;
}

export default function DashboardMapPreview({ analysis, onExplore }) {
  const [hovered, setHovered] = useState(null);
  const { nodes, edges } = useMemo(() => buildTopology(analysis), [analysis]);

  const arch = analysis?.architecture || analysis?.results || {};
  const featuredFlow = arch.flowPaths?.[0];

  const lit = useMemo(() => {
    if (!hovered) return null;
    const set = new Set([hovered]);
    for (const e of edges) {
      if (e.from === hovered) set.add(e.to);
      if (e.to === hovered) set.add(e.from);
    }
    return set;
  }, [hovered, edges]);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-auto block"
        role="img"
        aria-label="Architecture layer map"
      >
        <defs>
          <pattern id="dash-map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--c-line)" strokeWidth="0.5" opacity="0.45" />
          </pattern>
        </defs>
        <rect width={VIEW_W} height={VIEW_H} fill="var(--c-surface-2)" />
        <rect width={VIEW_W} height={VIEW_H} fill="url(#dash-map-grid)" />

        {edges.map((e) => {
          const d = edgePath(e.from, e.to, nodes);
          const active =
            !lit ||
            (lit.has(e.from) && lit.has(e.to));
          return (
            <path
              key={`${e.from}-${e.to}`}
              d={d}
              fill="none"
              stroke="var(--c-line-2)"
              strokeWidth={active ? 1.5 : 1}
              strokeOpacity={active ? 0.85 : 0.25}
            />
          );
        })}

        {nodes.map((node) => {
          const isHover = hovered === node.id;
          const dimmed = lit && !lit.has(node.id);
          const stroke =
            node.tier === "data"
              ? "var(--c-lime-line)"
              : node.tier === "edge"
                ? "var(--c-accent-line)"
                : "var(--c-line-2)";
          const fill = isHover ? "var(--c-surface-3)" : "var(--c-surface)";

          return (
            <g
              key={node.id}
              opacity={dimmed ? 0.35 : 1}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => node.file && onExplore?.(node.file)}
              style={{ cursor: node.file ? "pointer" : "default" }}
            >
              <rect
                x={node.x - 52}
                y={node.y - 16}
                width={104}
                height={32}
                rx={6}
                fill={fill}
                stroke={stroke}
                strokeWidth={isHover ? 1.5 : 1}
              />
              <text
                x={node.x}
                y={node.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--c-text-2)"
                fontSize={11}
                fontFamily="var(--font-mono, ui-monospace, monospace)"
              >
                {node.label}
              </text>
              {node.meta && (
                <text
                  x={node.x}
                  y={node.y + 22}
                  textAnchor="middle"
                  fill="var(--c-text-4)"
                  fontSize={9}
                  fontFamily="var(--font-mono, ui-monospace, monospace)"
                >
                  {node.meta}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {featuredFlow && (
        <div className="border-t border-c-line px-4 py-2.5 bg-c-surface flex items-start gap-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-c-lime flex-shrink-0 pt-0.5">
            Flow
          </span>
          <p className="text-[11px] text-c-text-3 leading-relaxed truncate">
            <span className="text-c-text-2 font-medium">{featuredFlow.name}</span>
            {featuredFlow.steps?.length ? ` · ${featuredFlow.steps.slice(0, 3).join(" → ")}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
