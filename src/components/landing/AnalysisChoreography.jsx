"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import HomeCard from "./HomeCard";

/**
 * Outcome-focused section — what users achieve with grepit.
 * Distinct from hero topology: demos citations, navigation, and proof.
 *
 * Color: accent (gold) = active / grepit value · lime = live dot only
 */

const OUTCOMES = [
  {
    id: "orient",
    label: "01 · Orient",
    title: "Know where to start",
    body: "Get a Start Here path through the files that matter: auth, routing, data layer. No README roulette.",
  },
  {
    id: "trace",
    label: "02 · Trace",
    title: "Follow any request path",
    body: "See how client calls flow through API, queue, and database. Click a subsystem and grepit lights the dependency chain.",
  },
  {
    id: "prove",
    label: "03 · Prove",
    title: "Answer with file:line proof",
    body: "Ask how auth works or where billing lives. Every answer cites src/path:line so you verify in one click.",
  },
];

const CYCLE_MS = 3600;

export default function AnalysisChoreography() {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: "-12%" });
  const playing = useInView(sectionRef, { margin: "-20%" });
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % OUTCOMES.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [playing]);

  const outcome = OUTCOMES[active];

  return (
    <section ref={sectionRef} className="relative z-[1] py-24 md:py-32 landing-section-x">
      <div className="max-w-[1180px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
            className="lg:col-span-5"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] mb-3 text-c-accent">
              What you can do
            </p>
            <h2
              className="font-semibold tracking-[-0.024em] leading-[1.06] mb-4"
              style={{ fontSize: "clamp(30px, 3.8vw, 46px)", color: "var(--c-text)" }}
            >
              Go from{" "}
              <span className="text-c-lime-pastel">stranger</span>
              {" "}to{" "}
              <span className="text-c-accent">expert.</span>
            </h2>
            <p className="text-[15px] md:text-[16px] leading-[1.6] text-c-text-2 mb-8 max-w-[440px]">
              Grepit is for engineers who inherit a repo and need to ship, not re-paste files into
              chat and hope the answer is right.
            </p>

            <div className="space-y-2">
              {OUTCOMES.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setActive(i)}
                  className="w-full text-left px-4 py-3.5 rounded-c-sm border btn-press"
                  style={{
                    borderColor: active === i ? "var(--c-accent-line)" : "var(--c-line)",
                    backgroundColor: active === i ? "var(--c-accent-soft)" : "transparent",
                    transform: active === i ? "translateX(4px)" : "translateX(0)",
                    transition: "border-color 220ms cubic-bezier(0.16, 1, 0.3, 1), background-color 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.12em] mb-1"
                    style={{ color: active === i ? "var(--c-accent)" : "var(--c-text-4)" }}
                  >
                    {o.label}
                  </p>
                  <p className="text-[14px] font-medium text-c-text">{o.title}</p>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="lg:col-span-7"
          >
            <HomeCard className="rounded-c-lg overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: "var(--c-line)", backgroundColor: "var(--c-surface-2)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-c-lime animate-pulse" aria-hidden />
                  <span className="font-mono text-[11px] text-c-text-3">grepit dashboard</span>
                </div>
                <span className="font-mono text-[10px] text-c-accent">{outcome.label}</span>
              </div>

              <div className="relative min-h-[320px] md:min-h-[360px] p-5 md:p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={outcome.id}
                    initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
                    transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <p className="text-[13px] text-c-text-2 mb-5 max-w-[480px] leading-[1.55]">
                      {outcome.body}
                    </p>
                    {outcome.id === "orient" && <DemoStartHere />}
                    {outcome.id === "trace" && <DemoTrace />}
                    {outcome.id === "prove" && <DemoCitation />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </HomeCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function DemoStartHere() {
  const steps = [
    { n: 1, file: "src/app/layout.tsx", why: "App shell + providers" },
    { n: 2, file: "src/middleware.ts", why: "Route protection" },
    { n: 3, file: "src/server/db/schema.ts", why: "Data model" },
  ];
  return (
    <div className="space-y-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-c-text-4 mb-2">
        Start here path
      </p>
      {steps.map((s, i) => (
        <motion.div
          key={s.file}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.12, duration: 0.35 }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-c-sm border"
          style={{
            borderColor: i === 0 ? "var(--c-accent-line)" : "var(--c-line)",
            backgroundColor: i === 0 ? "var(--c-accent-soft)" : "var(--c-surface-2)",
          }}
        >
          <span
            className="font-mono text-[10px] w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              backgroundColor: i === 0 ? "var(--c-accent)" : "var(--c-line)",
              color: i === 0 ? "var(--c-bg)" : "var(--c-text-3)",
            }}
          >
            {s.n}
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-c-text truncate">{s.file}</p>
            <p className="text-[11px] text-c-text-3">{s.why}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function DemoTrace() {
  const nodes = [
    { x: 40, y: 50, l: "client" },
    { x: 130, y: 35, l: "api" },
    { x: 220, y: 55, l: "queue" },
    { x: 300, y: 40, l: "db" },
  ];
  const d = "M 40 50 L 130 35 L 220 55 L 300 40";
  return (
    <svg viewBox="0 0 340 90" className="w-full max-w-[400px] h-[100px]">
      <defs>
        <style>{`
          @keyframes demo-trace {
            0% { stroke-dashoffset: 360; }
            50% { stroke-dashoffset: -360; }
            100% { stroke-dashoffset: -360; }
          }
        `}</style>
      </defs>
      <path
        d={d}
        fill="none"
        stroke="var(--c-line-2)"
        strokeWidth="1.25"
      />
      <path
        d={d}
        fill="none"
        stroke="var(--c-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="48 360"
        style={{ animation: "demo-trace 3.2s cubic-bezier(0.45,0,0.55,1) infinite" }}
      />
      {nodes.map((n, i) => (
        <g key={n.l}>
          <rect
            x={n.x - 28}
            y={n.y - 12}
            width={56}
            height={24}
            rx={6}
            fill="var(--c-surface-2)"
            stroke={i === 1 ? "var(--c-accent)" : "var(--c-line-2)"}
            strokeWidth="1"
          />
          <text
            x={n.x}
            y={n.y + 4}
            textAnchor="middle"
            fontSize="8"
            fill="var(--c-text-2)"
            fontFamily="ui-monospace, monospace"
          >
            {n.l}
          </text>
        </g>
      ))}
    </svg>
  );
}

function DemoCitation() {
  return (
    <div
      className="rounded-c-sm border p-4 max-w-[440px]"
      style={{ borderColor: "var(--c-accent-line)", backgroundColor: "var(--c-surface-2)" }}
    >
      <p className="text-[12px] text-c-text-2 mb-3">How does route protection work?</p>
      <p className="text-[12.5px] leading-[1.55] text-c-text">
        Clerk middleware runs at{" "}
        <code
          className="font-mono text-[11px] px-1.5 py-0.5 rounded"
          style={{ backgroundColor: "var(--c-accent-soft)", color: "var(--c-accent)" }}
        >
          src/middleware.ts:14
        </code>
        . Matches protected routes before the handler executes.
      </p>
      <p className="mt-3 font-mono text-[10px] text-c-text-4">3 sources cited · verified in repo</p>
    </div>
  );
}
