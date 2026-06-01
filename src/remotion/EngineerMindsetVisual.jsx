import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { REMOTION_THEME } from "./theme";

const FEATURE_QUESTION = '"How does checkout retry work?"';

const MAX_BLIND_MINUTES = 180;
const GREPIT_MINUTES = 10;
const GREPIT_START_MINUTES = 1;

const BLIND_STEPS = [
  {
    cmd: 'rg "checkout" src/',
    wait: "searching codebase",
    result: "89 matches · no flow view",
  },
  {
    cmd: 'find . -path "*webhook*"',
    wait: "scanning tree",
    result: "14 paths · still connecting dots",
  },
  {
    cmd: 'grep -r "retry" api/billing/',
    wait: "ripgrep running",
    result: "31 files · no end-to-end answer",
  },
];

const GREPIT_DELIVERABLES = [
  {
    label: "Flow diagram",
    wait: "mapping checkout → webhook → retry",
  },
  {
    label: "Code snippet",
    wait: "pulling the exact handler",
  },
  {
    label: "Cited answer",
    wait: "grounding in indexed source",
  },
];

const STEP_FRAMES = 38;
const TYPE_FRAMES = 14;
const WAIT_FRAMES = 16;

export function EngineerMindsetVisual({ theme = "light" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = REMOTION_THEME[theme] ?? REMOTION_THEME.light;

  const blindMinutes = interpolate(frame, [0, fps * 3.2], [20, MAX_BLIND_MINUTES], {
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });

  const grepitMinutes = interpolate(frame, [0, fps * 1.0], [GREPIT_START_MINUTES, GREPIT_MINUTES], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: c.surface2,
        fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
        padding: "36px 44px 32px",
      }}
    >
      <div
        style={{
          height: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 1px 1fr",
          columnGap: 36,
        }}
      >
        <Side
          colors={c}
          accent={c.coral}
          label="Other tools"
          prompt={FEATURE_QUESTION}
          detail="Grep and re-prompt. Still no picture of the flow."
          metric={formatDuration(blindMinutes)}
          metricNote="grep · find · re-prompt · still guessing"
        >
          <SequentialCommandFeed colors={c} frame={frame} steps={BLIND_STEPS} prompt="$" />
        </Side>

        <div style={{ gridColumn: 2, backgroundColor: c.line, opacity: 0.45 }} />

        <Side
          colors={c}
          accent={c.lime}
          label="With grepit"
          prompt={FEATURE_QUESTION}
          detail="Diagrams, snippets, citations. Same question."
          metric={formatDuration(grepitMinutes)}
          metricNote="map · snippet · src/path:line"
          style={{ gridColumn: 3 }}
        >
          <GrepitDeliverablesFeed colors={c} frame={frame} fps={fps} />
        </Side>
      </div>
    </AbsoluteFill>
  );
}

function GrepitDeliverablesFeed({ colors: c, frame, fps }) {
  const stepLen = Math.round(STEP_FRAMES * 0.82);
  const waitLen = Math.round(WAIT_FRAMES * 0.75);
  const stepIndex = Math.min(GREPIT_DELIVERABLES.length - 1, Math.floor(frame / stepLen));
  const local = frame - stepIndex * stepLen;
  const step = GREPIT_DELIVERABLES[stepIndex];
  const waiting = local <= waitLen;
  const done = local > waitLen;
  const dots = waiting ? ".".repeat(1 + Math.floor((local / 8) % 3)) : "";

  return (
    <div style={{ marginTop: 14, minHeight: 120, display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ margin: 0, fontFamily: "ui-monospace, monospace", fontSize: 11, color: c.lime, fontWeight: 600 }}>
        {step.label}
        {waiting ? dots : ""}
      </p>
      {waiting ? (
        <MutedLine colors={c}>{step.wait}{dots}</MutedLine>
      ) : null}
      {done ? <DeliverablePreview colors={c} type={stepIndex} frame={local} fps={fps} /> : null}
    </div>
  );
}

function DeliverablePreview({ colors: c, type, frame, fps }) {
  if (type === 0) {
    const progress = interpolate(frame, [0, fps * 0.35], [0, 1], { extrapolateRight: "clamp" });
    return (
      <div style={{ padding: "10px 0" }}>
        <svg width="100%" height="56" viewBox="0 0 220 56">
          <FlowNode c={c} x={8} y={18} w={52} h={22} label="checkout" opacity={progress > 0.1 ? 1 : 0.35} />
          <FlowNode c={c} x={84} y={18} w={52} h={22} label="webhook" opacity={progress > 0.45 ? 1 : 0.35} />
          <FlowNode c={c} x={160} y={18} w={44} h={22} label="retry" opacity={progress > 0.75 ? 1 : 0.35} />
          <line x1={60} y1={29} x2={84} y2={29} stroke={c.lime} strokeWidth="1.5" opacity={0.3 + progress * 0.5} />
          <line x1={136} y1={29} x2={160} y2={29} stroke={c.lime} strokeWidth="1.5" opacity={0.3 + progress * 0.5} />
        </svg>
        <MutedLine colors={c}>End-to-end flow, not scattered grep hits</MutedLine>
      </div>
    );
  }

  if (type === 1) {
    const lines = [
      "async function retryWebhook(event) {",
      "  await queue.publish(event, { attempts: 3 });",
      "  if (failed) await dlq.push(event);",
      "}",
    ];
    return (
      <div style={{ borderLeft: `2px solid ${c.lime}`, paddingLeft: 10 }}>
        {lines.map((line, i) => (
          <p
            key={line}
            style={{
              margin: 0,
              fontFamily: "ui-monospace, monospace",
              fontSize: 10,
              lineHeight: 1.55,
              color: i === 0 ? c.accent : c.text3,
              fontWeight: i === 0 ? 600 : 400,
            }}
          >
            {line}
          </p>
        ))}
        <MutedLine colors={c}>Exact handler, not a wall of matches</MutedLine>
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: 0, fontFamily: "ui-monospace, monospace", fontSize: 12, fontWeight: 600, color: c.accent }}>
        src/api/webhooks.ts:42
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 11, lineHeight: 1.45, color: c.text2 }}>
        retryWebhook publishes to queue, dead-letters on failure.
      </p>
      <MutedLine colors={c}>Start Here path · ask in chat · export report</MutedLine>
    </div>
  );
}

function FlowNode({ c, x, y, w, h, label, opacity }) {
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={5} fill={c.bg} stroke={c.lime} strokeWidth="1.2" />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="9" fill={c.text}>
        {label}
      </text>
    </g>
  );
}

function SequentialCommandFeed({ colors: c, frame, steps, prompt, accent, fast }) {
  const stepLen = fast ? Math.round(STEP_FRAMES * 0.82) : STEP_FRAMES;
  const typeLen = fast ? Math.round(TYPE_FRAMES * 0.85) : TYPE_FRAMES;
  const waitLen = fast ? Math.round(WAIT_FRAMES * 0.75) : WAIT_FRAMES;

  const stepIndex = Math.min(steps.length - 1, Math.floor(frame / stepLen));
  const local = frame - stepIndex * stepLen;
  const step = steps[stepIndex];

  const typed = step.cmd
    ? Math.floor(interpolate(local, [0, typeLen], [0, step.cmd.length], { extrapolateRight: "clamp" }))
    : 0;
  const waiting = step.cmd ? local > typeLen && local <= typeLen + waitLen : local <= waitLen;
  const done = step.cmd ? local > typeLen + waitLen : local > waitLen;

  const promptColor = accent ?? c.coral;
  const dots = waiting ? ".".repeat(1 + Math.floor((local / 8) % 3)) : "";

  return (
    <TerminalBlock colors={c}>
      {steps.slice(0, stepIndex).map((prev, i) => (
        <MutedLine key={`done-${i}`} colors={c} opacity={0.38}>
          {prev.cmd ? `${prompt} ${prev.cmd}` : prev.result}
          {prev.result && prev.cmd ? ` → ${prev.result}` : ""}
        </MutedLine>
      ))}
      {step.cmd ? (
        <CommandLine colors={c} prompt={prompt} promptColor={promptColor}>
          {step.cmd.slice(0, typed)}
          {waiting ? dots : ""}
        </CommandLine>
      ) : null}
      {waiting && step.wait ? (
        <MutedLine colors={c}>
          {step.wait}
          {dots}
        </MutedLine>
      ) : null}
      {done && step.result ? <ResultLine colors={c}>{step.result}</ResultLine> : null}
    </TerminalBlock>
  );
}

function TerminalBlock({ colors: c, children }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: "12px 0",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 88,
      }}
    >
      {children}
    </div>
  );
}

function CommandLine({ colors: c, prompt, promptColor, children }) {
  return (
    <p style={{ margin: 0, fontFamily: "ui-monospace, monospace", fontSize: 11, lineHeight: 1.5, color: c.text2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      <span style={{ color: promptColor, fontWeight: 600 }}>{prompt} </span>
      {children}
    </p>
  );
}

function MutedLine({ colors: c, opacity = 0.65, children }) {
  return (
    <p style={{ margin: 0, fontFamily: "ui-monospace, monospace", fontSize: 11, lineHeight: 1.45, color: c.text4, opacity }}>
      {children}
    </p>
  );
}

function ResultLine({ colors: c, accent, children }) {
  return (
    <p
      style={{
        margin: 0,
        fontFamily: "ui-monospace, monospace",
        fontSize: 11,
        lineHeight: 1.45,
        color: accent ? c.accent : c.text3,
        fontWeight: accent ? 600 : 400,
      }}
    >
      {children}
    </p>
  );
}

function Side({ colors: c, accent, label, prompt, detail, metric, metricNote, style, children }) {
  return (
    <div
      style={{
        gridColumn: style?.gridColumn ?? 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        ...style,
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: accent,
            fontWeight: 600,
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: "14px 0 0",
            fontFamily: "ui-monospace, monospace",
            fontSize: 15,
            fontWeight: 500,
            color: c.text,
            lineHeight: 1.45,
          }}
        >
          {prompt}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.45, color: c.text3 }}>{detail}</p>
        {children}
      </div>

      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, color: c.text3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Time to start on a feature
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "ui-monospace, monospace",
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: accent,
          }}
        >
          {metric}
        </p>
        <p style={{ margin: "8px 0 0", fontFamily: "ui-monospace, monospace", fontSize: 11, color: c.text4 }}>{metricNote}</p>
      </div>
    </div>
  );
}

function formatDuration(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.round(minutes)}m`;
}

export const ENGINEER_MINDSET_DURATION = 150;
export const ENGINEER_MINDSET_FPS = 30;
export const ENGINEER_MINDSET_SIZE = { width: 880, height: 460 };
