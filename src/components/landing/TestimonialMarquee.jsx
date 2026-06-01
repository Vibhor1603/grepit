"use client";
import MarqueeTrack from "./MarqueeTrack";
import { SITE_CONFIG } from "../../lib/landing-config";

export default function TestimonialMarquee() {
  const items = SITE_CONFIG.testimonials.items;
  const track = [...items, ...items, ...items];

  return (
    <section
      id="testimonials"
      className="relative z-[1] py-20 md:py-24 overflow-hidden scroll-mt-[80px]"
    >
      <div className="marquee-fade-left pointer-events-none absolute inset-y-0 left-0 w-12 md:w-24 z-10" />
      <div className="marquee-fade-right pointer-events-none absolute inset-y-0 right-0 w-12 md:w-24 z-10" />

      <div className="landing-section-x mb-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] mb-2 text-c-accent">
          {SITE_CONFIG.testimonials.label}
        </p>
        <h2
          className="font-semibold tracking-[-0.024em]"
          style={{ fontSize: "clamp(24px, 3.2vw, 36px)", color: "var(--c-text)" }}
        >
          {SITE_CONFIG.testimonials.title}
        </h2>
      </div>

      <MarqueeTrack duration="42s">
        <div className="flex gap-4 pr-4">
          {track.map((t, i) => (
            <article
              key={`${t.name}-${i}`}
              className="testimonial-card flex-shrink-0 w-[min(320px,82vw)] p-5 md:p-6 rounded-c-lg border bg-c-surface border-c-line shadow-[var(--shadow-2)]"
            >
              <p className="text-[14px] leading-[1.6] mb-5 text-c-text-2">{t.quote}</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold bg-c-lime-soft text-c-lime border border-c-lime-line">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-c-text">{t.name}</p>
                  <p className="text-[11px] text-c-text-3">{t.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </MarqueeTrack>
    </section>
  );
}
