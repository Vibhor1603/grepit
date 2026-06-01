import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { REMOTION_THEME } from "./theme";

const NOT_GREPIT = {
  eyebrow: "What grepit is not",
  title: "IDEs and AI assistants",
  subtitle: "Built to write and edit code",
  items: [
    "You re-paste files and folders every session",
    "Answers guess from whatever context fits in the window",
    "No persistent map of how the repo connects",
    "No default file:line citations",
    "Heavy users burn 3 to 5M tokens per deep session",
  ],
};

const IS_GREPIT = {
  eyebrow: "What grepit is",
  title: "grepit",
  subtitle: "Built to read and navigate codebases",
  items: [
    "Paste a URL once. The full repo is indexed",
    "Answers pull from indexed source, not your clipboard",
    "Live architecture map and Start Here path",
    "Health report with severity-tagged findings at file:line",
    "Every reply cites src/path:line",
    "Typical query uses under 5K tokens",
  ],
};

const PROOF = [
  { label: "Tokens per deep question", them: "~200K+", us: "<5K" },
  { label: "Time to first map", them: "Manual hours", us: "<60 sec" },
  { label: "Monthly cost (active dev)", them: "$60 to $125", us: "From $12" },
];

function easeOutStrong(t) {
  return Easing.bezier(0.23, 1, 0.32, 1)(t);
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function Card({
  c,
  x,
  y,
  w,
  h,
  border,
  children,
  shadow = true,
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 16,
        backgroundColor: c.bg,
        border: `1px solid ${border}`,
        boxShadow: shadow ? "0 18px 44px rgba(0,0,0,0.12)" : undefined,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function IconX({ c, progress }) {
  const p = clamp01(progress);
  const enter = easeOutStrong(p);
  const x = interpolate(enter, [0, 1], [-10, 0]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const draw = interpolate(enter, [0, 1], [0.2, 1]);
  const dash = 22;
  const off = dash * (1 - draw);
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      style={{
        flexShrink: 0,
        transform: `translateX(${x}px)`,
        opacity,
      }}
    >
      <path
        d="M3 3 L11 11"
        stroke={c.coral}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeDasharray={dash}
        strokeDashoffset={off}
      />
      <path
        d="M11 3 L3 11"
        stroke={c.coral}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeDasharray={dash}
        strokeDashoffset={off}
      />
    </svg>
  );
}

function IconCheck({ c, progress }) {
  const p = clamp01(progress);
  const enter = easeOutStrong(p);
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const draw = interpolate(enter, [0, 1], [0.15, 1]);
  const dash = 28;
  const off = dash * (1 - draw);
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" style={{ flexShrink: 0, opacity }}>
      <path
        d="M2.3 7.4 L5.7 10.8 L11.9 3.2"
        stroke={c.accent}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash}
        strokeDashoffset={off}
      />
    </svg>
  );
}

function CompareList({ c, side, data, frame, fps }) {
  const isGrepit = side === "is";
  const baseX = 0;
  const baseY = 0;

  const headerOpacity = interpolate(frame, [0, fps * 0.25], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const itemStart = fps * 0.42;
  const itemGap = Math.round(fps * 0.24);
  const iconLead = Math.round(fps * 0.11);

  return (
    <div style={{ padding: 26 }}>
      <p
        style={{
          margin: 0,
          fontFamily: "ui-monospace, monospace",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: isGrepit ? c.accent : c.text4,
          opacity: headerOpacity,
          fontWeight: 600,
        }}
      >
        {data.eyebrow}
      </p>
      <p
        style={{
          margin: "10px 0 2px",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: c.text,
          opacity: headerOpacity,
        }}
      >
        {data.title}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: c.text3,
          opacity: headerOpacity,
        }}
      >
        {data.subtitle}
      </p>

      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        {data.items.map((item, i) => {
          const t0 = itemStart + i * itemGap;
          const iconP = interpolate(frame, [t0, t0 + iconLead], [0, 1], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
            easing: Easing.out(Easing.quad),
          });
          return (
            <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              {isGrepit ? <IconCheck c={c} progress={iconP} /> : <IconX c={c} progress={iconP} />}
              <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13.5,
                    lineHeight: 1.45,
                    color: isGrepit ? c.text : c.text3,
                  }}
                >
                  {item}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProofStrip({ c, frame, fps }) {
  const y = 382;
  const h = 140;
  const appear = interpolate(frame, [fps * 0.55, fps * 0.85], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = appear;
  const translate = interpolate(appear, [0, 1], [10, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: y,
        right: 0,
        height: h,
        opacity,
        transform: `translateY(${translate}px)`,
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${c.line}`,
        backgroundColor: c.bg,
        boxShadow: "0 12px 34px rgba(0,0,0,0.10)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
      }}
    >
      {PROOF.map((row, i) => (
        <div
          key={row.label}
          style={{
            padding: "22px 24px",
            borderLeft: i > 0 ? `1px solid ${c.line}` : undefined,
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              fontFamily: "ui-monospace, monospace",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: c.text3,
              fontWeight: 600,
            }}
          >
            {row.label}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
            <div>
              <p style={{ margin: "0 0 3px", fontSize: 11, color: c.text4 }}>Others</p>
              <p style={{ margin: 0, fontSize: 15, color: c.text3, fontWeight: 600, textDecoration: "line-through" }}>
                {row.them}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, color: c.accent, fontWeight: 600 }}>grepit</p>
              <p style={{ margin: 0, fontSize: 17, color: c.accent, fontWeight: 800 }}>{row.us}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ValueCompareVisual({ theme = "light" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = REMOTION_THEME[theme] ?? REMOTION_THEME.light;

  const stageOpacity = interpolate(frame, [0, fps * 0.2], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "transparent",
        fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
        padding: 0,
        opacity: stageOpacity,
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <Card c={c} x={0} y={0} w={540} h={360} border={c.line}>
          <CompareList c={c} side="not" data={NOT_GREPIT} frame={frame} fps={fps} />
        </Card>
        <Card c={c} x={560} y={0} w={540} h={360} border={c.accentLine}>
          <CompareList c={c} side="is" data={IS_GREPIT} frame={frame} fps={fps} />
        </Card>
        <ProofStrip c={c} frame={frame} fps={fps} />
      </div>
    </AbsoluteFill>
  );
}

export const VALUE_COMPARE_DURATION = 300;
export const VALUE_COMPARE_FPS = 30;
export const VALUE_COMPARE_SIZE = { width: 1100, height: 522 };

