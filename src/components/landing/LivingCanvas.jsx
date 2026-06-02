"use client";
import { useEffect, useId, useMemo, useState } from "react";
import { BOLT_PATH } from "../ViboLogo";

/** Staggered markers per route — visible flow without trail lines. */
const MARKER_STAGGER = [0, 0.34, 0.68];
const HERO_MARKER_STAGGER = [0, 0.55];

/**
 * LivingCanvas — decorative topology. Autonomous packet-tracer style data flow.
 * No node/edge interaction; only the parent HomeCard tilt applies.
 */

const NODES = [
  { id: "client", label: "client", tier: "edge", x: 80, y: 80, order: 0 },
  { id: "edge_cdn", label: "edge", tier: "edge", x: 300, y: 80, order: 1 },
  { id: "webhooks", label: "webhooks", tier: "edge", x: 520, y: 80, order: 2 },
  { id: "auth", label: "auth", tier: "core", x: 130, y: 220, order: 3 },
  { id: "api", label: "api", tier: "core", x: 300, y: 220, order: 4, primary: true },
  { id: "queue", label: "queue", tier: "core", x: 470, y: 220, order: 5 },
  { id: "cache", label: "cache", tier: "data", x: 200, y: 360, order: 6 },
  { id: "db", label: "db", tier: "data", x: 360, y: 360, order: 7, primary: true },
  { id: "object", label: "store", tier: "data", x: 500, y: 360, order: 8 },
];

const HERO_NODES = [
  { id: "client", label: "client", tier: "edge", x: 104, y: 86, order: 0 },
  { id: "edge_cdn", label: "edge", tier: "edge", x: 254, y: 86, order: 1 },
  { id: "gateway", label: "gateway", tier: "edge", x: 404, y: 86, order: 2 },
  { id: "auth", label: "auth", tier: "core", x: 104, y: 218, order: 3 },
  { id: "api", label: "api", tier: "core", x: 254, y: 218, order: 4, primary: true },
  { id: "queue", label: "queue", tier: "core", x: 404, y: 218, order: 5 },
  { id: "worker", label: "worker", tier: "core", x: 534, y: 218, order: 6 },
  { id: "cache", label: "cache", tier: "data", x: 186, y: 346, order: 7 },
  { id: "db", label: "database", tier: "data", x: 334, y: 346, order: 8, primary: true },
  { id: "store", label: "store", tier: "data", x: 492, y: 346, order: 9 },
];

const EDGES = [
  { from: "client", to: "edge_cdn" },
  { from: "client", to: "auth" },
  { from: "edge_cdn", to: "api" },
  { from: "auth", to: "api" },
  { from: "webhooks", to: "queue" },
  { from: "api", to: "queue" },
  { from: "api", to: "cache" },
  { from: "api", to: "db" },
  { from: "queue", to: "db" },
  { from: "db", to: "object" },
];

const HERO_EDGES = [
  { from: "client", to: "edge_cdn" },
  { from: "edge_cdn", to: "gateway" },
  { from: "edge_cdn", to: "api" },
  { from: "gateway", to: "api" },
  { from: "client", to: "auth" },
  { from: "auth", to: "api" },
  { from: "api", to: "queue" },
  { from: "queue", to: "worker" },
  { from: "api", to: "cache" },
  { from: "api", to: "db" },
  { from: "worker", to: "db" },
  { from: "cache", to: "db" },
  { from: "db", to: "store" },
];

const TRAVERSAL_PATHS = [
  { id: "request", nodes: ["client", "edge_cdn", "api", "db"], duration: 5.5, delay: 0, color: "accent" },
  { id: "auth", nodes: ["client", "auth", "api", "cache"], duration: 5, delay: 1.2, color: "accent" },
  { id: "pipeline", nodes: ["client", "edge_cdn", "api", "queue", "db"], duration: 6.5, delay: 0.6, color: "lime" },
  { id: "webhook", nodes: ["webhooks", "queue", "db", "object"], duration: 6, delay: 1.8, color: "accent" },
  { id: "storage", nodes: ["api", "db", "object"], duration: 4.5, delay: 2.2, color: "lime" },
];

/** Hero — fewer routes, lighter visual load. */
const HERO_TRAVERSAL_PATHS = [
  { id: "request", nodes: ["client", "edge_cdn", "gateway", "api", "db"], duration: 6.2, delay: 0, color: "accent" },
  { id: "pipeline", nodes: ["api", "queue", "worker", "db", "store"], duration: 6.4, delay: 1.3, color: "lime" },
];

const NODE_SIZE = 50;
const HERO_NODE_SIZE = 62;

function nodeById(id, nodes) {
  return nodes.find((n) => n.id === id);
}

function nodeAnchor(node, toward, size) {
  const tx = toward.x - node.x;
  const ty = toward.y - node.y;
  const angle = Math.atan2(ty, tx);
  const half = size / 2 + 2;
  const dist = Math.min(
    half / (Math.abs(Math.cos(angle)) || 1e-6),
    half / (Math.abs(Math.sin(angle)) || 1e-6),
  );
  return { x: node.x + Math.cos(angle) * dist, y: node.y + Math.sin(angle) * dist };
}

function edgeSegment(a, b, size) {
  return {
    x1: nodeAnchor(a, b, size).x,
    y1: nodeAnchor(a, b, size).y,
    x2: nodeAnchor(b, a, size).x,
    y2: nodeAnchor(b, a, size).y,
  };
}

function buildRoutedPoints(nodeIds, nodes, size) {
  const pts = nodeIds.map((id) => nodeById(id, nodes)).filter(Boolean);
  if (pts.length < 2) return [];
  const points = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const start = nodeAnchor(pts[i], pts[i + 1], size);
    const end = nodeAnchor(pts[i + 1], pts[i], size);
    if (i === 0) points.push(start);
    points.push(end);
    if (i < pts.length - 2) {
      points.push(nodeAnchor(pts[i + 1], pts[i + 2], size));
    }
  }
  return points;
}

function pointsToD(points) {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

/** Small data packet — neutral dot, not product logo. */
function DataPacketMarker({ fill, opacity = 1, scale = 1 }) {
  return (
    <g opacity={opacity} transform={`scale(${scale})`}>
      <rect x={-5} y={-2.5} width={10} height={5} rx={2.5} fill={fill} opacity={0.9} />
      <rect x={-1.4} y={-1.4} width={2.8} height={2.8} rx={1.4} fill="var(--c-card-panel)" opacity={0.85} />
    </g>
  );
}

function BoltMarker({ fill, opacity = 1, scale }) {
  return (
    <g transform={`scale(${scale}) translate(-24, -23)`} opacity={opacity}>
      <path d={BOLT_PATH} fill={fill} />
    </g>
  );
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduce;
}

export default function LivingCanvas({ variant = "default" }) {
  const isHero = variant === "hero";
  const activeNodes = isHero ? HERO_NODES : NODES;
  const activeEdges = isHero ? HERO_EDGES : EDGES;
  const nodeSize = isHero ? HERO_NODE_SIZE : NODE_SIZE;
  const uid = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      setMounted(true);
      return;
    }
    const delay = isHero ? 0 : 640;
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [reduceMotion, isHero]);

  const nodeByIdMap = useMemo(
    () => new Map(activeNodes.map((n) => [n.id, n])),
    [activeNodes],
  );

  const traversals = useMemo(
    () => {
      const paths = isHero ? HERO_TRAVERSAL_PATHS : TRAVERSAL_PATHS;
      return paths
        .map((path) => {
          if (!path.nodes.every((id) => activeNodes.some((n) => n.id === id))) return null;
          const points = buildRoutedPoints(path.nodes, activeNodes, nodeSize);
          return {
            ...path,
            d: pointsToD(points),
            pathId: `${uid}-path-${path.id}`,
          };
        })
        .filter(Boolean);
    },
    [activeNodes, isHero, nodeSize, uid],
  );

  const markerStagger = isHero ? HERO_MARKER_STAGGER : MARKER_STAGGER;

  const tierLines = isHero ? [152, 290] : [150, 290];
  const tierLabels = isHero
    ? [
        { y: 86, label: "edge" },
        { y: 218, label: "service" },
        { y: 362, label: "data" },
      ]
    : [
        { y: 80, label: "edge" },
        { y: 220, label: "service" },
        { y: 360, label: "data" },
      ];

  const half = nodeSize / 2;

  return (
    <div className={`lc-canvas-wrap w-full h-full pointer-events-none${isHero ? " lc-canvas-wrap--hero" : ""}`}>
      <svg
        viewBox="0 0 600 440"
        className="lc-canvas w-full h-full block select-none"
        role="img"
        aria-hidden
      >
        <defs>
          <pattern id={`${uid}-grid`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--c-topology-grid, var(--c-line))" strokeWidth="0.75" />
          </pattern>

          <linearGradient id={`${uid}-marker-accent`} x1="14" y1="4" x2="34" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--c-accent-bright)" />
            <stop offset="55%" stopColor="var(--c-accent)" />
            <stop offset="100%" stopColor="var(--c-accent-dim)" />
          </linearGradient>

          <linearGradient id={`${uid}-marker-lime`} x1="14" y1="4" x2="34" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--c-lime-bright)" />
            <stop offset="55%" stopColor="var(--c-lime)" />
            <stop offset="100%" stopColor="var(--c-lime-dim)" />
          </linearGradient>

          <filter id={`${uid}-node-shadow`} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="2.25" stdDeviation="1.45" floodColor="#000" floodOpacity="0.28" />
          </filter>

          <filter id={`${uid}-marker-glow`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {!isHero ? (
          <rect width="600" height="440" className="lc-canvas-bg" fill="var(--c-topology-bg, var(--c-surface-2))" />
        ) : null}
        <rect width="600" height="440" fill={`url(#${uid}-grid)`} className={isHero ? "lc-grid lc-grid--hero" : "lc-grid"} />

        {tierLines.map((y, i) => (
          <line
            key={y}
            x1="64"
            x2="568"
            y1={y}
            y2={y}
            className="lc-tier-line"
            style={{
              opacity: mounted ? 1 : 0,
              transition: `opacity 400ms cubic-bezier(0.23, 1, 0.32, 1) ${80 + i * 40}ms`,
            }}
          />
        ))}

        {tierLabels.map((t, i) => (
          <text
            key={t.label}
            x="24"
            y={t.y + 4}
            className="lc-tier-label"
            style={{
              opacity: mounted ? 1 : 0,
              transition: `opacity 360ms cubic-bezier(0.23, 1, 0.32, 1) ${140 + i * 60}ms`,
            }}
          >
            {t.label}
          </text>
        ))}

        <g className="lc-edges">
          {activeEdges.map((e, i) => {
            const a = nodeByIdMap.get(e.from);
            const b = nodeByIdMap.get(e.to);
            if (!a || !b) return null;
            const seg = edgeSegment(a, b, nodeSize);
            const touchesData = a.tier === "data" || b.tier === "data";
            return (
              <line
                key={`${e.from}-${e.to}`}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                className={`lc-edge${touchesData ? " lc-edge--data" : ""}`}
                style={{
                  opacity: mounted ? undefined : 0,
                  transition: mounted
                    ? undefined
                    : `opacity 420ms cubic-bezier(0.23, 1, 0.32, 1) ${120 + i * 14}ms`,
                }}
              />
            );
          })}
        </g>

        {!reduceMotion && mounted && (
          <g className="lc-flows" aria-hidden>
            {traversals.map((path) => {
              const markerFill = path.color === "lime" ? `url(#${uid}-marker-lime)` : `url(#${uid}-marker-accent)`;
              const markerW = isHero ? 9 : 7.5;
              const markerScale = markerW / 48;
              return (
                <g key={path.id}>
                  <path id={path.pathId} d={path.d} fill="none" stroke="none" />
                  {markerStagger.map((offset, i) => (
                    <g
                      key={`${path.id}-${i}`}
                      className="lc-flow-marker"
                      filter={isHero ? undefined : `url(#${uid}-marker-glow)`}
                    >
                      {isHero ? (
                        <DataPacketMarker
                          fill={markerFill}
                          opacity={i === 0 ? 0.95 : 0.65}
                          scale={1.45}
                        />
                      ) : (
                        <BoltMarker fill={markerFill} opacity={i === 0 ? 1 : 0.72} scale={markerScale} />
                      )}
                      <animateMotion
                        dur={`${path.duration}s`}
                        repeatCount="indefinite"
                        begin={`${path.delay + path.duration * offset}s`}
                        calcMode="linear"
                        rotate={isHero ? "0" : "auto"}
                      >
                        <mpath href={`#${path.pathId}`} />
                      </animateMotion>
                    </g>
                  ))}
                </g>
              );
            })}
          </g>
        )}

        <g className="lc-nodes">
          {activeNodes.map((n) => {
            const x = n.x - half;
            const y = n.y - half;
            const pad = isHero ? 1.9 : 1.6;
            const baseInset = isHero ? 0.9 : 0.7;
            const baseDrop = isHero ? 2 : 1.55;
            return (
              <g
                key={n.id}
                className={`lc-node lc-node--${n.tier}${n.primary ? " lc-node--hub" : ""}${isHero ? " lc-node--hero" : ""}`}
                style={{
                  opacity: mounted ? undefined : 0,
                  transition: `opacity 460ms cubic-bezier(0.23, 1, 0.32, 1) ${180 + n.order * 40}ms`,
                }}
              >
                <rect
                  x={x + baseInset}
                  y={y + baseDrop}
                  width={nodeSize - baseInset * 2}
                  height={nodeSize - baseInset * 2}
                  rx={10}
                  ry={10}
                  className="lc-node__base"
                />
                <rect
                  x={x}
                  y={y}
                  width={nodeSize}
                  height={nodeSize}
                  rx={10}
                  ry={10}
                  className="lc-node__body"
                  filter={`url(#${uid}-node-shadow)`}
                />
                <rect
                  x={x + pad}
                  y={y + pad}
                  width={nodeSize - pad * 2}
                  height={nodeSize - pad * 2}
                  rx={8}
                  ry={8}
                  className="lc-node__highlight"
                />
                <text x={n.x} y={n.y + 4} textAnchor="middle" className="lc-node__label">
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
