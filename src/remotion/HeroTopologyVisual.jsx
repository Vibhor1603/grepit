import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BOLT_PATH,
  HERO_EDGES,
  HERO_FLOWS,
  HERO_NODE_SIZE,
  HERO_NODES,
  HERO_TIER_LABELS,
  HERO_TIER_LINES,
  activeEdgeKey,
  buildRoutedPoints,
  edgeSegment,
  getPointOnPolyline,
  nearestNodeId,
} from "../lib/heroTopology";
import { REMOTION_THEME } from "./theme";

const MARKER_OFFSETS = [0, 0.32, 0.64];
const EASE_UI = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_FLOW = Easing.bezier(0.45, 0, 0.55, 1);

export function HeroTopologyVisual({ theme = "light" }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const c = REMOTION_THEME[theme] ?? REMOTION_THEME.light;
  const half = HERO_NODE_SIZE / 2;

  const introEnd = Math.round(fps * 0.45);
  const gridOpacity = interpolate(frame, [0, introEnd * 0.35], [0.28, 0.38], {
    extrapolateRight: "clamp",
    easing: EASE_UI,
  });

  const activeFlow = getActiveFlow(frame, durationInFrames);
  const captionOpacity = interpolate(
    frame - activeFlow.localStart,
    [0, 8, activeFlow.duration - 10, activeFlow.duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const hotNodes = new Set();
  const hotEdges = new Set();

  const markers = HERO_FLOWS.flatMap((flow) => {
    const local = (frame - flow.start + durationInFrames) % durationInFrames;
    if (local < 0 || local > flow.duration) return [];

    const points = buildRoutedPoints(flow.nodes);
    const progress = interpolate(local, [0, flow.duration], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: EASE_FLOW,
    });

    return MARKER_OFFSETS.map((offset, i) => {
      const t = (progress + offset) % 1;
      const pt = getPointOnPolyline(points, t);
      hotNodes.add(nearestNodeId(pt));
      const segIdx = activeEdgeKey(points, t);
      if (segIdx != null && flow.nodes[segIdx] && flow.nodes[segIdx + 1]) {
        hotEdges.add(`${flow.nodes[segIdx]}-${flow.nodes[segIdx + 1]}`);
      }

      const enter = interpolate(local, [0, 10], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: EASE_UI,
      });

      return {
        key: `${flow.id}-${i}`,
        x: pt.x,
        y: pt.y,
        angle: pt.angle,
        color: flow.color,
        opacity: (i === 0 ? 1 : 0.68) * enter,
        scale: i === 0 ? 1 : 0.82,
      };
    });
  });

  return (
    <AbsoluteFill style={{ backgroundColor: c.surface2, fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif" }}>
      <svg viewBox="0 0 600 440" width="100%" height="100%" style={{ display: "block" }}>
        <defs>
          <pattern id="hero-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke={c.line} strokeWidth="0.75" />
          </pattern>
          <linearGradient id="hero-marker-accent" x1="14" y1="4" x2="34" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={c.accentBright} />
            <stop offset="55%" stopColor={c.accent} />
            <stop offset="100%" stopColor={c.accent} stopOpacity={0.85} />
          </linearGradient>
          <linearGradient id="hero-marker-lime" x1="14" y1="4" x2="34" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={c.lime} stopOpacity={0.95} />
            <stop offset="100%" stopColor={c.lime} stopOpacity={0.7} />
          </linearGradient>
        </defs>

        <rect width="600" height="440" fill={c.surface2} />
        <rect width="600" height="440" fill="url(#hero-grid)" opacity={gridOpacity} />

        {HERO_TIER_LINES.map((y, i) => {
          const lineOpacity = interpolate(frame, [introEnd * 0.2 + i * 6, introEnd * 0.55 + i * 6], [0, 0.55], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: EASE_UI,
          });
          return (
            <line key={y} x1={64} x2={568} y1={y} y2={y} stroke={c.line} strokeWidth={1} strokeDasharray="3 5" opacity={lineOpacity} />
          );
        })}

        {HERO_TIER_LABELS.map((t, i) => {
          const labelOpacity = interpolate(frame, [introEnd * 0.35 + i * 8, introEnd * 0.7 + i * 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: EASE_UI,
          });
          return (
            <text
              key={t.label}
              x={24}
              y={t.y + 4}
              fill={c.text4}
              fontFamily="ui-monospace, monospace"
              fontSize={9}
              letterSpacing="0.1em"
              opacity={labelOpacity}
            >
              {t.label.toUpperCase()}
            </text>
          );
        })}

        {HERO_EDGES.map((e, i) => {
          const seg = edgeSegment(e.from, e.to);
          if (!seg) return null;
          const key = `${e.from}-${e.to}`;
          const isHot = hotEdges.has(key);
          const baseOpacity = interpolate(frame, [introEnd * 0.4 + i * 3, introEnd * 0.75 + i * 3], [0, seg.fromTier === "data" || seg.toTier === "data" ? 0.45 : 0.55], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const stroke = seg.fromTier === "data" || seg.toTier === "data" ? c.limeLine : c.line;
          return (
            <line
              key={key}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={isHot ? (seg.fromTier === "data" || seg.toTier === "data" ? c.lime : c.accent) : stroke}
              strokeWidth={isHot ? 2 : 1.25}
              opacity={isHot ? Math.min(1, baseOpacity + 0.35) : baseOpacity}
            />
          );
        })}

        {HERO_NODES.map((n) => {
          const nodeEnter = interpolate(frame, [introEnd * 0.1 + n.order * 3, introEnd * 0.45 + n.order * 3], [0.55, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: EASE_UI,
          });
          const isHot = hotNodes.has(n.id);
          const hubPulse = n.primary
            ? 0.55 + 0.45 * Math.sin((frame / fps) * Math.PI * 0.9)
            : 1;
          const fill = theme === "dark" ? "#121214" : "#FFFCF7";
          const stroke = n.primary
            ? isHot
              ? n.tier === "data"
                ? c.lime
                : c.accent
              : n.tier === "data"
                ? c.limeLine
                : c.accentLine
            : isHot
              ? c.accentLine
              : c.line;

          return (
            <g key={n.id} opacity={nodeEnter}>
              <rect
                x={n.x - half}
                y={n.y - half}
                width={HERO_NODE_SIZE}
                height={HERO_NODE_SIZE}
                rx={10}
                fill={fill}
                stroke={stroke}
                strokeWidth={isHot ? 2 : 1.25}
                opacity={hubPulse}
              />
              {isHot ? (
                <rect
                  x={n.x - half - 3}
                  y={n.y - half - 3}
                  width={HERO_NODE_SIZE + 6}
                  height={HERO_NODE_SIZE + 6}
                  rx={12}
                  fill="none"
                  stroke={n.tier === "data" ? c.lime : c.accent}
                  strokeWidth={1}
                  opacity={interpolate(Math.sin((frame / fps) * Math.PI * 2), [-1, 1], [0.25, 0.55])}
                />
              ) : null}
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                fill={isHot ? c.text : c.text3}
                fontFamily="ui-monospace, monospace"
                fontSize={11}
                fontWeight={n.primary ? 600 : 400}
              >
                {n.label}
              </text>
            </g>
          );
        })}

        {markers.map((m) => {
          const fill = m.color === "lime" ? "url(#hero-marker-lime)" : "url(#hero-marker-accent)";
          const scale = (10 / 48) * m.scale;
          return (
            <g
              key={m.key}
              opacity={m.opacity}
              transform={`translate(${m.x}, ${m.y}) rotate(${m.angle + 90}) scale(${scale}) translate(-24, -23)`}
            >
              <path d={BOLT_PATH} fill={fill} />
            </g>
          );
        })}

        <rect x={0} y={400} width={600} height={40} fill={c.surface2} opacity={0.92} />
        <line x1={48} x2={552} y1={400} y2={400} stroke={c.line} strokeWidth={1} opacity={0.6} />

        <text x={48} y={422} fill={c.text4} fontFamily="ui-monospace, monospace" fontSize={9} letterSpacing="0.12em">
          TRACING · {activeFlow.flow.trace}
        </text>
        <text
          x={48}
          y={436}
          fill={c.text2}
          fontFamily="Geist, ui-sans-serif, system-ui, sans-serif"
          fontSize={11}
          opacity={captionOpacity}
        >
          {activeFlow.flow.caption}
        </text>
      </svg>
    </AbsoluteFill>
  );
}

function getActiveFlow(frame, durationInFrames) {
  const active = HERO_FLOWS.filter((f) => {
    const local = (frame - f.start + durationInFrames) % durationInFrames;
    return local <= f.duration;
  });

  const flow = active.length
    ? active.reduce((a, b) => {
        const la = (frame - a.start + durationInFrames) % durationInFrames;
        const lb = (frame - b.start + durationInFrames) % durationInFrames;
        return la < lb ? a : b;
      })
    : HERO_FLOWS[0];

  const local = (frame - flow.start + durationInFrames) % durationInFrames;
  return { flow, localStart: frame - local, duration: flow.duration };
}

export const HERO_TOPOLOGY_DURATION = 180;
export const HERO_TOPOLOGY_FPS = 30;
export const HERO_TOPOLOGY_SIZE = { width: 600, height: 440 };
