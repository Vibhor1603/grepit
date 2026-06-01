"use client";

import { useEffect, useState } from "react";
import { HERO_FLOWS } from "../../lib/heroTopology";

const INTERVAL_MS = 5200;

/** Bottom status strip — cycles narrative captions while LivingCanvas animates. */
export default function HeroFlowCaption() {
  const [index, setIndex] = useState(0);
  const flow = HERO_FLOWS[index % HERO_FLOWS.length];

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_FLOWS.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[2]"
      aria-hidden
    >
      <div className="border-t border-c-line bg-c-surface-2 px-6 md:px-8 py-2.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-c-text-4 mb-0.5">
          TRACING · {flow.trace}
        </p>
        <p
          key={flow.id}
          className="text-[11px] leading-[1.35] text-c-text-2 hero-flow-caption-fade"
        >
          {flow.caption}
        </p>
      </div>
    </div>
  );
}
