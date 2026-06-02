import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { REMOTION_THEME } from "./theme";

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

const NODES = [
  { id: "authorize", x: 140, y: 92, tint: "accent", icon: "key", delay: 0 },
  { id: "index", x: 500, y: 96, tint: "neutral", icon: "grid", delay: 6 },
  { id: "infer", x: 500, y: 272, tint: "lime", icon: "bolt", delay: 12 },
  { id: "delete", x: 140, y: 272, tint: "neutral", icon: "bin", delay: 18 },
];

const LINK_PATHS = [
  "M 170 96 C 250 78, 316 92, 468 98",
  "M 500 120 C 516 168, 516 196, 500 244",
  "M 470 270 C 344 294, 266 294, 170 276",
  "M 136 244 C 120 198, 120 168, 136 118",
];

function NodeIcon({ kind, c }) {
  if (kind === "key") {
    return (
      <g>
        <circle cx="0" cy="0" r="6" fill="none" stroke={c.accent} strokeWidth="2" />
        <line x1="5" y1="0" x2="14" y2="0" stroke={c.accent} strokeWidth="2" />
        <line x1="11" y1="-2.5" x2="11" y2="2.5" stroke={c.accent} strokeWidth="2" />
      </g>
    );
  }
  if (kind === "grid") {
    return (
      <g fill={c.text3}>
        <rect x="-7" y="-7" width="5" height="5" rx="1.5" />
        <rect x="2" y="-7" width="5" height="5" rx="1.5" />
        <rect x="-7" y="2" width="5" height="5" rx="1.5" />
        <rect x="2" y="2" width="5" height="5" rx="1.5" />
      </g>
    );
  }
  if (kind === "bolt") {
    return (
      <path
        d="M -1 -9 L 8 -9 L 2 -1 L 7 -1 L -4 10 L 0 2 L -5 2 Z"
        fill={c.lime}
      />
    );
  }
  return (
    <g stroke={c.text3} strokeWidth="1.8" fill="none" strokeLinecap="round">
      <rect x="-6.5" y="-5.5" width="13" height="12" rx="2.5" />
      <line x1="-8" y1="-7" x2="8" y2="-7" />
    </g>
  );
}

function SignalDot({ frame, c }) {
  const loop = frame % 90;
  const t = interpolate(loop, [0, 70], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.linear,
  });
  const fade = interpolate(loop, [58, 82], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = 170 + (468 - 170) * t;
  const y = 96 + (98 - 96) * t;
  return <circle cx={x} cy={y} r="3.6" fill={c.accent} opacity={fade} />;
}

export function PrivacyTrustVisual({ theme = "light" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = REMOTION_THEME[theme] ?? REMOTION_THEME.light;

  const intro = interpolate(frame, [0, fps * 0.65], [0, 1], {
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  const orbitPulse = interpolate(frame % 120, [0, 60, 120], [0.72, 1, 0.72], {
    easing: Easing.inOut(Easing.ease),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: c.surface,
      }}
    >
      <svg viewBox="0 0 640 360" width="100%" height="100%">
        <defs>
          <linearGradient id="privacyPathRemotion" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c.accentLine} />
            <stop offset="100%" stopColor={c.limeLine} />
          </linearGradient>
          <filter id="nodeShadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#000" floodOpacity={theme === "dark" ? 0.38 : 0.2} />
          </filter>
        </defs>

        {LINK_PATHS.map((d, i) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="url(#privacyPathRemotion)"
            strokeWidth="1.35"
            strokeDasharray="4 6"
            opacity={intro * (0.45 + i * 0.08)}
          />
        ))}

        <circle cx="320" cy="180" r="58" fill="none" stroke={c.accentLine} strokeWidth="1.2" opacity={0.7 * intro} />
        <circle cx="320" cy="180" r="43" fill={c.bg} stroke={c.line} strokeWidth="1" opacity={intro} />
        <circle cx="320" cy="180" r={6 + orbitPulse * 1.8} fill={c.accent} opacity={0.94 * intro} />
        <rect
          x="306.5"
          y="166.5"
          width="27"
          height="27"
          rx="8"
          fill={c.surface2}
          stroke={c.accentLine}
          strokeWidth="1.3"
          opacity={0.88 * intro}
        />
        <circle cx="320" cy="180" r="4.3" fill="none" stroke={c.accentLine} strokeWidth="1.2" opacity={0.88 * intro} />

        <SignalDot frame={frame} c={c} />

        {NODES.map((n) => {
          const appear = interpolate(frame, [n.delay, n.delay + 22], [0, 1], {
            extrapolateRight: "clamp",
            easing: EASE_OUT,
          });
          const y = n.y + (1 - appear) * 12;
          const scale = 0.88 + appear * 0.12;
          const bg = n.tint === "neutral" ? c.surface2 : c.bg;
          const border = n.tint === "accent" ? c.accentLine : n.tint === "lime" ? c.limeLine : c.line;

          return (
            <g
              key={n.id}
              transform={`translate(${n.x} ${y}) scale(${scale})`}
              opacity={appear}
              filter="url(#nodeShadow)"
            >
              <rect x="-26" y="-26" width="52" height="52" rx="14" fill={bg} stroke={border} strokeWidth="1.2" />
              <rect x="-22.5" y="-22.5" width="45" height="45" rx="11" fill="rgba(255,255,255,0.06)" />
              <NodeIcon kind={n.icon} c={c} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

export const PRIVACY_TRUST_DURATION = 180;
export const PRIVACY_TRUST_FPS = 30;
export const PRIVACY_TRUST_SIZE = { width: 640, height: 360 };

