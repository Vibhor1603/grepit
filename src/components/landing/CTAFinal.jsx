"use client";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

/**
 * CTAFinal — closing CTA, quiet. macOS rounding, theme-aware.
 * No eyebrow rule, no glowing pill.
 */
export default function CTAFinal({ onCta }) {
  return (
    <section className="relative z-[1] py-0">
      <div className="cta-final-fullbleed">
        <div className="cta-final-fullbleed__noise" aria-hidden />
        <div className="cta-final-fullbleed__overlay" aria-hidden />
        <div className="relative z-[1] mx-auto w-full max-w-[980px] px-5 sm:px-8 md:px-10 py-20 md:py-24 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-semibold tracking-[-0.024em] leading-[1.04] mb-5"
            style={{ fontSize: "clamp(34px, 4vw, 48px)", color: "var(--c-text)" }}
          >
            Paste a repository.{" "}
            <span style={{ color: "var(--c-lime-pastel)" }}>See the architecture.</span>
          </motion.h2>
          <p
            className="mx-auto mb-8 max-w-[620px] text-[14px] leading-[1.6]"
            style={{ color: "var(--c-text-2)" }}
          >
            Free to start. Paste a repo URL and get a map, a reading path, and cited answers in
            under a minute.
          </p>
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            onClick={onCta}
            className="btn-press inline-flex items-center gap-2 text-[13.5px] font-semibold py-3 px-5 rounded-c-sm"
            style={{
              backgroundColor: "var(--c-accent)",
              color: "var(--c-bg)",
              transition:
                "opacity 160ms var(--ease-out-strong), transform 160ms var(--ease-out-strong)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Analyze a codebase
            <ArrowRight size={15} />
          </motion.button>
        </div>
      </div>
    </section>
  );
}
