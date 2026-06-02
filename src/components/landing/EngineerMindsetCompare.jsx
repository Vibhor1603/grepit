"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EngineerMindsetPlayer from "./EngineerMindsetPlayer";

const BLIND_START_MINUTES = 20;
const BLIND_END_MINUTES = 180;
const GREPIT_START_MINUTES = 1;
const GREPIT_END_MINUTES = 10;

const BLIND_ANIMATE_MS = 3200;
const GREPIT_ANIMATE_MS = 1000;
const LOOP_HOLD_MS = 1800;
const LOOP_MS = BLIND_ANIMATE_MS + LOOP_HOLD_MS;

function easeInQuad(t) {
  return t * t;
}

function easeOutQuad(t) {
  return t * (2 - t);
}

function formatDuration(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.round(minutes)}m`;
}

function useAnimatedMinutes({ from, to, animateMs, ease }) {
  const [minutes, setMinutes] = useState(from);

  useEffect(() => {
    const startAt = performance.now();
    let raf = 0;

    const step = (now) => {
      const elapsed = (now - startAt) % LOOP_MS;
      if (elapsed <= animateMs) {
        const t = ease(elapsed / animateMs);
        setMinutes(from + (to - from) * t);
      } else {
        setMinutes(to);
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to, animateMs, ease]);

  return minutes;
}

const BLIND_STEPS = [
  { cmd: 'rg "checkout" src/', result: "89 matches · no flow view" },
  { cmd: 'find . -path "*webhook*"', result: "14 paths · still connecting dots" },
];

const GREPIT_STEPS = [
  { label: "Flow diagram", detail: "checkout → webhook → retry" },
  { label: "Code snippet", detail: "exact handler pulled" },
  { label: "Cited answer", detail: "src/api/webhooks.ts:42" },
];

function MobileCompare() {
  const [phase, setPhase] = useState(0);
  const blindMinutes = useAnimatedMinutes({
    from: BLIND_START_MINUTES,
    to: BLIND_END_MINUTES,
    animateMs: BLIND_ANIMATE_MS,
    ease: easeInQuad,
  });
  const grepitMinutes = useAnimatedMinutes({
    from: GREPIT_START_MINUTES,
    to: GREPIT_END_MINUTES,
    animateMs: GREPIT_ANIMATE_MS,
    ease: easeOutQuad,
  });

  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % 3), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div
        className="rounded-c-md border p-4 sm:p-5 bg-[var(--c-card-panel)] border-[var(--c-card-panel-border)]"
        style={{ boxShadow: "var(--shadow-card-rest)" }}
      >
        <p className="landing-eyebrow text-c-coral mb-2">Other tools</p>
        <p className="text-[13px] font-mono text-c-text mb-1">&quot;How does checkout retry work?&quot;</p>
        <p className="text-[12px] text-c-text-3 mb-3">Grep and re-prompt. Still no picture of the flow.</p>
        <div
          className="rounded-md bg-[var(--c-card-panel-inner)] border border-[var(--c-line)] px-3 py-2.5 space-y-1.5 mb-4 min-h-[72px]"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              <p className="font-mono text-[10px] text-c-text-4 truncate">
                $ {BLIND_STEPS[phase % BLIND_STEPS.length].cmd}
              </p>
              <p className="font-mono text-[10px] text-c-text-3 mt-1">
                → {BLIND_STEPS[phase % BLIND_STEPS.length].result}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="text-[10px] uppercase tracking-wider text-c-text-4 mb-1">Time to start on a feature</p>
        <p className="font-mono text-[28px] sm:text-[32px] font-bold text-c-coral leading-none">
          {formatDuration(blindMinutes)}
        </p>
      </div>

      <div
        className="rounded-c-md border p-4 sm:p-5 bg-[var(--c-card-panel)] border-[var(--c-card-panel-border)] border-c-accent-line"
        style={{ boxShadow: "var(--shadow-card-rest)" }}
      >
        <p className="landing-eyebrow text-c-lime mb-2">With grepit</p>
        <p className="text-[13px] font-mono text-c-text mb-1">&quot;How does checkout retry work?&quot;</p>
        <p className="text-[12px] text-c-text-3 mb-3">Diagrams, snippets, citations. Same question.</p>
        <div className="rounded-md bg-c-lime-soft/40 border border-c-lime-line px-3 py-2.5 mb-4 min-h-[72px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              <p className="font-mono text-[11px] font-semibold text-c-lime">{GREPIT_STEPS[phase].label}</p>
              <p className="text-[11px] text-c-text-2 mt-1">{GREPIT_STEPS[phase].detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="text-[10px] uppercase tracking-wider text-c-text-4 mb-1">Time to start on a feature</p>
        <p className="font-mono text-[28px] sm:text-[32px] font-bold text-c-lime leading-none">
          {formatDuration(grepitMinutes)}
        </p>
      </div>
    </div>
  );
}

export default function EngineerMindsetCompare() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  if (isMobile) {
    return (
      <div className="p-3 sm:p-4">
        <MobileCompare />
      </div>
    );
  }

  return (
    <div
      className="w-full h-full min-h-[260px]"
      style={{ aspectRatio: "880 / 460" }}
    >
      <EngineerMindsetPlayer />
    </div>
  );
}
