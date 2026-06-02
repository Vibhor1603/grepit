"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import HomeCard from "./HomeCard";

const NOT_GREPIT = {
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

export default function ValueCompare() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: "-8%" });
  const [animCycle, setAnimCycle] = useState(0);
  const seenRef = useRef(false);

  useEffect(() => {
    if (inView && !seenRef.current) {
      setAnimCycle((n) => n + 1);
      seenRef.current = true;
      return;
    }
    if (!inView) seenRef.current = false;
  }, [inView]);

  return (
    <section
      id="why"
      ref={ref}
      className="relative z-[2] landing-section-x pt-14 sm:pt-20 md:pt-28 lg:pt-32 pb-20 sm:pb-28 md:pb-36 lg:pb-40 scroll-mt-[80px]"
    >
      <div className="max-w-[1100px] mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="font-mono text-[11px] uppercase tracking-[0.16em] mb-5 md:mb-6 text-center md:text-left text-c-accent"
        >
          Why grepit
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.04, ease: [0.23, 1, 0.32, 1] }}
          className="landing-h2 mb-5 md:mb-6 text-center md:text-left text-c-text"
        >
          Not for writing code.{" "}
          <span className="text-c-lime-pastel">For understanding it.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
          className="landing-body mb-14 md:mb-20 max-w-[580px] mx-auto md:mx-0 text-center md:text-left text-c-text-2"
        >
          Cursor, Copilot, and Claude Code help you write code inside an editor. Grepit helps you
          inherit, audit, and explain a codebase you did not write, with a persistent map and
          answers grounded in the full repo.
        </motion.p>

        {/* Tilt cards with replayable X/✓ animation */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
          className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 lg:gap-8 mb-12 md:mb-16 lg:mb-20"
        >
          <CompareColumn side="not" data={NOT_GREPIT} cycle={animCycle} />
          <CompareColumn side="is" data={IS_GREPIT} highlight cycle={animCycle} />
        </motion.div>

        {/* Proof strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          <HomeCard className="rounded-c-lg overflow-hidden" maxTilt={7}>
          <div className="grid grid-cols-1 md:grid-cols-3">
            {PROOF.map((row, i) => (
              <div
                key={row.label}
                className={`px-6 py-6 md:px-7 md:py-8 lg:px-8 lg:py-9 ${i > 0 ? "border-t md:border-t-0 md:border-l" : ""}`}
                style={{ borderColor: "var(--c-line)" }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.14em] mb-3"
                  style={{ color: "var(--c-text-3)" }}
                >
                  {row.label}
                </p>
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <p className="text-[11px] mb-0.5" style={{ color: "var(--c-text-4)" }}>
                      Others
                    </p>
                    <p className="text-[15px] font-medium line-through" style={{ color: "var(--c-text-3)" }}>
                      {row.them}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] mb-0.5 text-c-accent">grepit</p>
                    <p className="text-[17px] font-semibold text-c-accent">{row.us}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </HomeCard>
        </motion.div>
      </div>
    </section>
  );
}

function CompareColumn({ data, side, highlight = false, cycle }) {
  const isRight = side === "is";

  return (
    <HomeCard
      depth={highlight ? "elevated" : "default"}
      className="rounded-c-lg p-5 sm:p-7 md:p-8 lg:p-9 h-full"
      style={{
        borderColor: highlight ? "var(--c-accent-line)" : "var(--c-line-2)",
      }}
    >
      <p
        className="font-mono text-[10px] uppercase tracking-[0.14em] mb-1"
        style={{ color: highlight ? "var(--c-accent)" : "var(--c-text-4)" }}
      >
        {isRight ? "What grepit is" : "What grepit is not"}
      </p>
      <p className="text-[18px] font-semibold mb-1 tracking-[-0.02em]" style={{ color: "var(--c-text)" }}>
        {data.title}
      </p>
      <p className="text-[13px] mb-6 md:mb-7" style={{ color: "var(--c-text-3)" }}>
        {data.subtitle}
      </p>
      <ul className="space-y-3.5 md:space-y-4">
        {data.items.map((item, i) => (
          <li key={`${cycle}-${item}`} className="flex items-start gap-2.5">
            <span
              className={`value-compare-mark ${isRight ? "value-compare-mark--check" : "value-compare-mark--x"}`}
              style={{ animationDelay: `${i * 260}ms` }}
              aria-hidden
            />
            <span
              className="text-[13.5px] leading-[1.45]"
              style={{ color: isRight ? "var(--c-text)" : "var(--c-text-3)" }}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}
