"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import EngineerMindsetCompare from "./EngineerMindsetCompare";
import HomeCard from "./HomeCard";

const POINTS = [
  "Map before you prompt.",
  "Scan the health report before you ship.",
  "Ask with proof: src/path:line on every answer.",
  "Spend judgment, not tokens.",
];

export default function EngineerMindset() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-8%" });
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    if (inView) setShowPlayer(true);
  }, [inView]);

  return (
    <section
      id="mindset"
      ref={ref}
      className="relative z-[1] landing-section-x py-16 sm:py-20 md:py-32 scroll-mt-[80px]"
    >
      <div className="max-w-[1240px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
            className="lg:col-span-4 xl:col-span-4"
          >
            <p className="landing-eyebrow mb-3 text-c-accent">Orientation, not generation</p>
            <h2
              className="mb-3 text-c-text font-semibold tracking-[-0.026em] leading-[1.05]"
              style={{ fontSize: "clamp(34px, 4.2vw, 52px)" }}
            >
              Don&apos;t vibe code what you{" "}
              <span className="text-c-lime-pastel">don&apos;t understand.</span>
            </h2>
            <p
              className="mb-5 text-c-accent font-semibold leading-[1.25] tracking-[-0.01em]"
              style={{ fontSize: "clamp(18px, 2vw, 24px)" }}
            >
              Work like a seasoned engineer, not a token furnace.
            </p>

            <ul className="space-y-3">
              {POINTS.map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -8 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.07, ease: [0.23, 1, 0.32, 1] }}
                  className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-c-text-2"
                >
                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-c-lime flex-shrink-0" aria-hidden />
                  {line}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
            className="lg:col-span-8 xl:col-span-8 max-w-full w-full"
          >
            <HomeCard
              className="rounded-c-lg overflow-hidden border w-full"
              style={{
                borderColor: "var(--c-line)",
                boxShadow: "var(--shadow-3)",
              }}
            >
              {showPlayer ? (
                <EngineerMindsetCompare />
              ) : (
                <div
                  className="w-full min-h-[260px] animate-pulse"
                  style={{ backgroundColor: "var(--c-surface-2)" }}
                  aria-hidden
                />
              )}
            </HomeCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
