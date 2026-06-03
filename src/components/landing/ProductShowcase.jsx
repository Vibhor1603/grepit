"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import HomeCard from "./HomeCard";
import ScrollReveal from "./ScrollReveal";
import {
  MockPanelUrl,
  MockPanelExplorer,
  MockPanelMap,
  MockPanelHealth,
  MockPanelChat,
  MOCK_PANEL_TITLES,
} from "./ProductMockPanels";

const STEPS = [
  {
    id: "url",
    n: "01",
    title: "Paste a GitHub link",
    hint: "Public or private repo. One URL is all grepit needs.",
    outcome: "We clone the repo and start indexing every file in the tree.",
  },
  {
    id: "index",
    n: "02",
    title: "We parse the full codebase",
    hint: "40+ languages, AST-level structure, not just text search.",
    outcome: "You get a searchable file tree with syntax-aware navigation.",
  },
  {
    id: "map",
    n: "03",
    title: "Your architecture map appears",
    hint: "Subsystems, APIs, auth, and data layers connected by dependency edges.",
    outcome: "You get a live topology diagram and a Start Here reading path.",
  },
  {
    id: "health",
    n: "04",
    title: "Health report surfaces risks",
    hint: "Secrets, unsafe patterns, and missing tests, severity-tagged.",
    outcome: "Every finding links to the exact file and line in your repo.",
  },
  {
    id: "ask",
    n: "05",
    title: "Ask questions with proof",
    hint: "Chat grounded in indexed source, not pasted snippets.",
    outcome: "Every answer cites src/path:line so you can verify in one click.",
  },
];

const PANELS = [MockPanelUrl, MockPanelExplorer, MockPanelMap, MockPanelHealth, MockPanelChat];
const STEP_COUNT = STEPS.length;
const MOBILE_MQ = "(max-width: 1023px)";

function useMobilePipeline() {
  const [isMobile, setIsMobile] = useState(true);

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function PipelineHeader() {
  return (
    <>
      <p className="landing-eyebrow mb-3 text-c-accent">How it works</p>
      <h2 className="landing-h2 mb-4 text-c-text">
        From link to{" "}
        <span className="text-c-lime-pastel">full understanding.</span>
      </h2>
      <p className="landing-body text-c-text-2 max-w-[460px]">
        Grepit reads your whole repo once, builds a navigable map, runs a health scan,
        and opens a dashboard where you browse files, trace architecture, and ask questions
        with file:line citations.
      </p>
    </>
  );
}

export default function ProductShowcase() {
  const isMobile = useMobilePipeline();
  return isMobile ? <ProductShowcaseMobile /> : <ProductShowcaseDesktop />;
}

function ProductShowcaseMobile() {
  return (
    <section id="pipeline" className="product-showcase-mobile relative z-[1] landing-section-x">
      <div className="w-full max-w-[680px] mx-auto pt-8 sm:pt-10 pb-4">
        <PipelineHeader />

        <div className="product-showcase-mobile-steps">
          {STEPS.map((step, i) => {
            const Panel = PANELS[i];
            const bleed = i === 1 || i === 2;

            return (
              <ScrollReveal key={step.id} variant="up" delay={i * 50}>
                <article className="product-showcase-mobile-step">
                  <div className="product-showcase-mobile-step__head">
                    <span className="product-showcase-mobile-step__num">{step.n}</span>
                    <div className="min-w-0">
                      <h3 className="product-showcase-mobile-step__title">{step.title}</h3>
                      <p className="product-showcase-mobile-step__hint">{step.hint}</p>
                      {step.outcome ? (
                        <p className="product-showcase-mobile-step__outcome">{step.outcome}</p>
                      ) : null}
                    </div>
                  </div>

                  <HomeCard depth="flat" className="rounded-none border-0 shadow-none">
                    <WindowChrome title={MOCK_PANEL_TITLES[i]} />
                    <div className="product-showcase-mobile-stage">
                      <div
                        className={`product-showcase-mobile-stage__inner${
                          bleed ? " product-showcase-mobile-stage__inner--bleed" : ""
                        }`}
                      >
                        <Panel />
                      </div>
                    </div>
                  </HomeCard>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProductShowcaseDesktop() {
  const wrapRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.min(STEP_COUNT - 1, Math.max(0, Math.floor(v * STEP_COUNT))));
  });

  return (
    <section
      id="pipeline"
      ref={wrapRef}
      className="product-showcase-section relative z-[1] scroll-mt-[80px]"
    >
      <div className="product-showcase-sticky sticky top-0 flex items-center landing-section-x">
        <div className="w-full max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-12 landing-section-gap items-center">
          <ScrollReveal variant="left" className="lg:col-span-5 order-2 lg:order-1">
            <div>
              <PipelineHeader />

              <ol className="space-y-1.5 md:space-y-2 mt-6 md:mt-8">
                {STEPS.map((step, i) => (
                  <StepRow key={step.id} step={step} active={active === i} compact={active !== i} />
                ))}
              </ol>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={90} variant="right" className="lg:col-span-7 relative order-1 lg:order-2">
            <HomeCard depth="elevated" className="product-showcase-card rounded-c-lg">
              <div className="overflow-hidden rounded-[inherit]">
                <WindowChrome title={MOCK_PANEL_TITLES[active]} />
                <div className="product-showcase-stage relative bg-c-surface-2">
                  {PANELS.map((Panel, i) => (
                    <ScrollPanel key={STEPS[i].id} show={active === i} bleed={i === 1 || i === 2}>
                      <Panel />
                    </ScrollPanel>
                  ))}
                </div>
              </div>
            </HomeCard>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function ScrollPanel({ show, children, bleed = false }) {
  return (
    <div
      className={`absolute inset-0 product-scroll-panel ${bleed ? "p-0" : "p-5 md:p-6"}`}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0) scale(1)" : "translateY(10px) scale(0.98)",
        filter: show ? "blur(0)" : "blur(3px)",
        pointerEvents: show ? "auto" : "none",
        transition:
          "opacity 320ms var(--ease-out-strong), transform 320ms var(--ease-out-strong), filter 240ms ease",
      }}
    >
      {children}
    </div>
  );
}

function StepRow({ step, active, compact }) {
  return (
    <li
      className={`flex gap-3 md:gap-4 px-3 md:px-4 rounded-c-sm border transition-all duration-220 ${
        compact ? "py-2.5" : "py-3.5"
      }`}
      style={{
        backgroundColor: active ? "var(--c-surface)" : "transparent",
        borderColor: active ? "var(--c-accent-line)" : "transparent",
        boxShadow: active ? "var(--shadow-1)" : "none",
      }}
    >
      <span
        className="font-mono landing-type-label tabular-nums pt-0.5 flex-shrink-0"
        style={{ color: active ? "var(--c-accent)" : "var(--c-text-4)" }}
      >
        {step.n}
      </span>
      <div className="min-w-0">
        <p className={`font-medium text-c-text ${active ? "landing-type-body" : "landing-type-caption"}`}>
          {step.title}
        </p>
        {active ? (
          <>
            <p className="landing-type-caption text-c-text-3 mt-0.5 leading-[1.45]">{step.hint}</p>
            {step.outcome ? (
              <p className="landing-type-caption text-c-accent mt-1.5 leading-[1.45] font-medium">{step.outcome}</p>
            ) : null}
          </>
        ) : (
          <p className="landing-type-label text-c-text-4 mt-0.5 truncate hidden sm:block">{step.hint}</p>
        )}
      </div>
    </li>
  );
}

function WindowChrome({ title }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 border-b"
      style={{ borderColor: "var(--c-line)", backgroundColor: "var(--c-surface-2)" }}
    >
      <span className="w-2 h-2 rounded-full bg-[#ff5f57]" aria-hidden />
      <span className="w-2 h-2 rounded-full bg-[#febc2e]" aria-hidden />
      <span className="w-2 h-2 rounded-full bg-c-lime" aria-hidden />
      <span className="font-mono text-[10px] ml-2 text-c-text-4 truncate">{title}</span>
    </div>
  );
}
