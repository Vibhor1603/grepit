"use client";

import { LayoutGrid, MessageSquare, Shield, ArrowRight } from "lucide-react";
import { healthScore } from "../utils/client/formatting";

const CAPABILITIES = [
  {
    icon: LayoutGrid,
    title: "Orient",
    desc: "See how systems connect before you read a single file.",
    prompt: "Give me a high-level architecture overview of this codebase.",
  },
  {
    icon: MessageSquare,
    title: "Trace",
    desc: "Follow a request from entry point to database.",
    prompt: "Where does a typical API request enter and what does it touch?",
  },
  {
    icon: Shield,
    title: "Prove",
    desc: "Every answer cites file paths and line numbers.",
    prompt: "What are the most important files I should read first?",
  },
];

export default function DashboardOrientation({ analysis, onAsk }) {
  const score = healthScore(analysis);
  const components = analysis?.architecture?.components?.length ?? 0;
  const flows = analysis?.architecture?.flowPaths?.length ?? 0;

  return (
    <div className="w-full max-w-[820px] mx-auto space-y-7">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-c-accent mb-2">
          Analysis ready
        </p>
        <h2 className="text-[22px] md:text-[26px] font-semibold tracking-[-0.03em] text-c-text mb-2">
          Ask anything about your codebase
        </h2>
        <p className="text-[13px] text-c-text-3 max-w-md mx-auto leading-relaxed">
          Grounded answers with file citations, architecture diagrams, and request-flow
          traces. Built from your repo, not generic guesses.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          {
            label: "Health",
            value: `${score}`,
            accent: score >= 75 ? "text-c-lime" : "text-c-accent",
          },
          { label: "Files", value: analysis?.total_files?.toLocaleString() || "-" },
          { label: "Components", value: components || "-" },
          { label: "Flows", value: flows || "-" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-c-line bg-c-surface px-3 py-2.5 text-center"
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-c-text-4 mb-0.5">
              {stat.label}
            </p>
            <p className={`text-[17px] font-semibold tabular-nums ${stat.accent || "text-c-text"}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {CAPABILITIES.map(({ icon: Icon, title, desc, prompt }) => (
          <button
            key={title}
            type="button"
            onClick={() => onAsk?.(prompt)}
            className="group text-left rounded-lg border border-c-line bg-c-surface p-4 hover:border-c-accent-line transition-colors duration-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className="text-c-accent" strokeWidth={2} />
              <span className="text-[13px] font-semibold text-c-text">{title}</span>
            </div>
            <p className="text-[12px] text-c-text-3 leading-relaxed mb-3">{desc}</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-c-accent group-hover:gap-1.5 transition-all duration-200">
              Ask <ArrowRight size={11} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
