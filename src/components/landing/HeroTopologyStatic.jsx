import {
  HERO_EDGES,
  HERO_NODE_SIZE,
  HERO_NODES,
  HERO_TIER_LABELS,
  HERO_TIER_LINES,
  edgeSegment,
} from "../../lib/heroTopology";

/** Lightweight static topology — paints instantly for LCP, replaced by Remotion when ready. */
export default function HeroTopologyStatic() {
  const half = HERO_NODE_SIZE / 2;

  return (
    <svg
      viewBox="0 0 600 440"
      width="100%"
      height="100%"
      className="block select-none"
      role="img"
      aria-label="Architecture topology preview"
    >
      <defs>
        <pattern id="hero-static-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--c-line)" strokeWidth="0.75" />
        </pattern>
      </defs>

      <rect width="600" height="440" fill="var(--c-surface-2)" />
      <rect width="600" height="440" fill="url(#hero-static-grid)" opacity="0.38" />

      {HERO_TIER_LINES.map((y) => (
        <line key={y} x1={64} x2={568} y1={y} y2={y} stroke="var(--c-line)" strokeWidth={1} strokeDasharray="3 5" opacity={0.55} />
      ))}

      {HERO_TIER_LABELS.map((t) => (
        <text
          key={t.label}
          x={24}
          y={t.y + 4}
          fill="var(--c-text-4)"
          fontFamily="ui-monospace, monospace"
          fontSize={9}
          letterSpacing="0.1em"
        >
          {t.label.toUpperCase()}
        </text>
      ))}

      {HERO_EDGES.map((e) => {
        const seg = edgeSegment(e.from, e.to);
        if (!seg) return null;
        const isData = seg.fromTier === "data" || seg.toTier === "data";
        return (
          <line
            key={`${e.from}-${e.to}`}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke={isData ? "var(--c-lime-line)" : "var(--c-line-2)"}
            strokeWidth={1.25}
            opacity={isData ? 0.45 : 0.55}
          />
        );
      })}

      {HERO_NODES.map((n) => (
        <g key={n.id}>
          <rect
            x={n.x - half}
            y={n.y - half}
            width={HERO_NODE_SIZE}
            height={HERO_NODE_SIZE}
            rx={10}
            fill="var(--c-surface-elev, var(--c-surface))"
            stroke={n.primary ? (n.tier === "data" ? "var(--c-lime-line)" : "var(--c-accent-line)") : "var(--c-line-2)"}
            strokeWidth={n.primary ? 1.5 : 1.25}
          />
          <text
            x={n.x}
            y={n.y + 4}
            textAnchor="middle"
            fill="var(--c-text-3)"
            fontFamily="ui-monospace, monospace"
            fontSize={11}
            fontWeight={n.primary ? 600 : 400}
          >
            {n.label}
          </text>
        </g>
      ))}

      <rect x={0} y={400} width={600} height={40} fill="var(--c-surface-2)" opacity={0.92} />
      <line x1={48} x2={552} y1={400} y2={400} stroke="var(--c-line)" strokeWidth={1} opacity={0.6} />
      <text x={48} y={422} fill="var(--c-text-4)" fontFamily="ui-monospace, monospace" fontSize={9} letterSpacing="0.12em">
        TRACING · request path
      </text>
      <text x={48} y={436} fill="var(--c-text-2)" fontFamily="var(--font-geist-sans), system-ui, sans-serif" fontSize={11}>
        HTTP request → edge → API → database
      </text>
    </svg>
  );
}
