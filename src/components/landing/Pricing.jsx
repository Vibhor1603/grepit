"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";
import { PLANS } from "../../config/plans";
import { usePlan } from "../../hooks/usePlan";
import HomeCard from "./HomeCard";

/**
 * Pricing — three quiet macOS cards.
 *
 * Decisions:
 *   - No eyebrow rule + dot pattern.
 *   - The "recommended" plan is set apart by a soft accent ring + filled CTA,
 *     not by a glowing pill.
 *   - Free + Pro stay neutral so the recommendation actually reads as one.
 */
export default function Pricing({ onSelect, subscribing }) {
  const { plan: currentPlan } = usePlan();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });

  const plans = [
    { key: "free",    accent: false, ...PLANS.free },
    { key: "starter", accent: true,  ...PLANS.starter },
    { key: "pro",     accent: false, ...PLANS.pro },
  ];

  return (
    <section
      ref={ref}
      className="relative z-[1] py-28 md:py-36 landing-section-x"
    >
      <div className="relative max-w-[1240px] mx-auto">
        {/* Heading — grid layout, no eyebrow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <h2 className="landing-h2 text-c-text">
              Start free.{" "}
              <span className="text-c-accent">Upgrade when scale demands it.</span>
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 lg:pt-6"
          >
            <p className="landing-body text-c-text-2 max-w-[520px]">
              No credit card required to begin. Limits are explicit. Upgrades take
              effect instantly. Cancel anytime from your profile.
            </p>
          </motion.div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p, i) => {
            const isCurrent = currentPlan === p.key;
            const ctaLabel = isCurrent ? "Current plan" : p.cta;
            return (
              <motion.div
                key={p.key}
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <HomeCard
                  className="h-full rounded-c-md border"
                  style={{
                    borderColor: p.accent ? "var(--c-accent-line)" : "var(--c-line)",
                    boxShadow: p.accent ? "var(--shadow-2)" : "var(--shadow-1)",
                  }}
                >
                  <div className="p-7 md:p-8 h-full flex flex-col">
                    <div className="flex items-baseline justify-between mb-6">
                      <span
                        className="text-[14px] font-semibold tracking-tight"
                        style={{ color: "var(--c-text)" }}
                      >
                        {p.name}
                      </span>
                      {p.accent && (
                        <span
                          className="font-mono text-[10px] uppercase tracking-[0.14em]"
                          style={{ color: "var(--c-accent)" }}
                        >
                          recommended
                        </span>
                      )}
                    </div>

                    <div className="mb-7">
                      <span
                        className="text-[40px] font-semibold tracking-[-0.02em]"
                        style={{ color: "var(--c-text)" }}
                      >
                        {p.price}
                      </span>
                      <span
                        className="font-mono text-[12px] ml-1.5"
                        style={{ color: "var(--c-text-3)" }}
                      >
                        {p.period}
                      </span>
                    </div>

                    <ul className="space-y-2.5 mb-8 flex-1 min-h-[180px]">
                      {p.features.map((f, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2.5 text-[13.5px] leading-[1.5]"
                          style={{ color: "var(--c-text-2)" }}
                        >
                          <Check
                            size={13}
                            className="mt-0.5 flex-shrink-0"
                            style={{ color: p.accent ? "var(--c-accent)" : "var(--c-text-3)" }}
                            strokeWidth={2.4}
                          />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => onSelect?.(p.name)}
                      disabled={isCurrent || subscribing === p.key}
                      className={`w-full py-2.5 rounded-c-sm text-[13px] font-semibold disabled:opacity-50 ${
                        isCurrent ? "cursor-default" : ""
                      }`}
                      style={{
                        backgroundColor: p.accent ? "var(--c-accent)" : "var(--c-surface-2)",
                        color: p.accent ? "var(--c-bg)" : "var(--c-text)",
                        border: p.accent ? "none" : "1px solid var(--c-line)",
                        transition:
                          "background-color 160ms var(--ease-out-strong), color 160ms var(--ease-out-strong), opacity 160ms var(--ease-out-strong), transform 160ms var(--ease-out-strong)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent && subscribing !== p.key) {
                          e.currentTarget.style.opacity = "0.92";
                        }
                      }}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      {subscribing === p.key ? "Loading…" : ctaLabel}
                    </button>
                  </div>
                </HomeCard>
              </motion.div>
            );
          })}
        </div>

        <p
          className="mt-7 font-mono text-[11px] text-center"
          style={{ color: "var(--c-text-3)" }}
        >
          all plans support private repositories · cancel anytime · taxes calculated at checkout
        </p>
      </div>
    </section>
  );
}
