"use client";
import { useRef, useState, useEffect } from "react";
import HomeCard from "./HomeCard";

const BARS = [
  { label: "Claude Code", cost: 125, pct: 83 },
  { label: "Cursor", cost: 60, pct: 40 },
  { label: "Copilot", cost: 19, pct: 13 },
  { label: "grepit", cost: 12, pct: 8, highlight: true },
];

function useCountUp(target, active) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    setN(0);
    let raf;
    const start = performance.now();
    const dur = 700;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      setN(Math.round((1 - (1 - t) ** 3) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return n;
}

/**
 * Compact savings block: big number, slider, slim bars.
 */
export default function TokenSavings() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const seenRef = useRef(false);
  const [q, setQ] = useState(12);
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        const visible = Boolean(e.isIntersecting);
        setInView(visible);
        if (visible && !seenRef.current) {
          setPlayKey((k) => k + 1);
          seenRef.current = true;
        } else if (!visible) {
          seenRef.current = false;
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const savedM = (((q * 200_000) - (q * 5_000)) / 1_000_000).toFixed(1);
  const pct = useCountUp(95, playKey);

  return (
    <section
      id="savings"
      ref={ref}
      className="relative z-[1] landing-section-x py-14 md:py-18 scroll-mt-[80px]"
    >
      <div className="max-w-[900px] mx-auto">
        <HomeCard
          className="rounded-c-lg border p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
          style={{
            borderColor: "var(--c-line-2)",
            boxShadow: "var(--shadow-2)",
            backgroundColor: "var(--c-surface)",
          }}
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] mb-2 text-c-accent">
              Token savings
            </p>
            <p
              className="text-[14px] leading-[1.5] text-c-text-2 mb-4 max-w-[360px]"
            >
              Deep codebase questions normally burn hundreds of thousands of tokens per session.
              Grepit indexes once and answers from that index, so each query stays small.
            </p>
            <p
              className="font-semibold tracking-[-0.03em] leading-[1.05] mb-3"
              style={{ fontSize: "clamp(32px, 4vw, 48px)", color: "var(--c-text)" }}
            >
              <span className="text-c-accent">{pct}%</span> fewer tokens
            </p>
            <p className="text-[13px] text-c-text-2 mb-5 max-w-[320px]">
              Index once. Query with under 5K tokens each time.
            </p>

            <label className="block">
              <div className="flex justify-between text-[12px] mb-2">
                <span className="text-c-text-2">Questions / week</span>
                <span className="font-mono font-semibold text-c-accent">{q}</span>
              </div>
              <input
                type="range"
                min={3}
                max={30}
                value={q}
                onChange={(e) => setQ(Number(e.target.value))}
                className="token-slider w-full"
              />
            </label>

            <p
              className="mt-4 text-[13px] font-mono px-3 py-2 rounded-c-xs inline-block"
              style={{ backgroundColor: "var(--c-accent-soft)", color: "var(--c-text)" }}
            >
              ~{savedM}M tokens saved / week
            </p>
          </div>

          <div className="space-y-3" key={`bars-${playKey}`}>
            {BARS.map((bar, i) => (
              <div key={bar.label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className={bar.highlight ? "text-c-lime font-medium" : "text-c-text-3"}>
                    {bar.label}
                  </span>
                  <span className="font-mono text-c-text-4">${bar.cost}/mo</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-c-surface-3">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: inView ? `${bar.pct}%` : "0%",
                      backgroundColor: bar.highlight ? "var(--c-lime)" : "var(--c-text-4)",
                      transition: `width 0.85s var(--ease-out-strong) ${i * 0.08}s`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </HomeCard>
      </div>
    </section>
  );
}
