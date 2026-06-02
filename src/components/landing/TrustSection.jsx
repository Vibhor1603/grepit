"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";

import HomeCard from "./HomeCard";
import { SITE_CONFIG } from "../../lib/landing-config";

const EASE = [0.23, 1, 0.32, 1];

export default function TrustSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-12%" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (inView) setMounted(true);
  }, [inView]);

  const { trust } = SITE_CONFIG;
  const cards = [trust.commitments[0], trust.commitments[2], trust.commitments[3]];

  return (
    <section
      ref={ref}
      id="trust"
      aria-labelledby="trust-heading"
      className="relative z-[2] landing-section-x pt-10 sm:pt-12 md:pt-14 pb-8 sm:pb-10 md:pb-12 scroll-mt-[calc(var(--landing-nav-h)+12px)]"
    >
      <div className="max-w-[1180px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.48, ease: EASE }}
        >
          <div className="max-w-[920px] mx-auto text-center mb-5 sm:mb-6 md:mb-7">
            <p className="landing-eyebrow text-c-accent mb-2">{trust.label}</p>
            <h2 id="trust-heading" className="landing-h2 text-c-text">
              {trust.title} <span className="text-c-lime-pastel">{trust.titleAccent}</span>
            </h2>
            <p className="landing-body text-c-text-2 max-w-[720px] mx-auto mt-3">
              {trust.subtitle}
            </p>
            {trust.honesty ? (
              <p className="landing-caption text-c-text-4 mt-3 max-w-[700px] mx-auto">
                {trust.honesty}
              </p>
            ) : null}
            <Link
              href="/privacy"
              className="inline-flex mt-4 items-center gap-2 font-mono landing-type-label uppercase tracking-[0.14em] text-c-text-3 min-h-[36px] transition-colors duration-220 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-c-text"
            >
              <span>{trust.linkLabel}</span>
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="max-w-[980px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
            {cards.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.04 + i * 0.06, ease: EASE }}
              >
                <HomeCard depth="default" maxTilt={9} className="rounded-c-lg overflow-hidden h-full">
                  <div className="privacy-mini-card p-4 sm:p-4.5 md:p-5 h-full">
                    <div className="privacy-mini-card__dot" aria-hidden />
                    <p className="privacy-mini-card__title">{item.title}</p>
                    <p className="privacy-mini-card__body">{item.body}</p>
                  </div>
                </HomeCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
