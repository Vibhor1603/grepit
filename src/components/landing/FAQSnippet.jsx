"use client";
import { useState } from "react";
import { Plus } from "lucide-react";

const QUESTIONS = [
  {
    q: "What does grepit actually do?",
    a: "It parses your repo, builds an architecture map, and answers questions grounded in source code with file paths and line numbers.",
  },
  {
    q: "Is my code stored?",
    a: "Analysis runs in isolated, short-lived serverless workers. We keep only the structural outputs needed for features (map, findings, grounded snippets), scoped to your account. Repositories are private by default, and no human reviews your code.",
  },
  {
    q: "Does it work on private repos?",
    a: "Yes. Connect GitHub once via OAuth. Any repo you can access becomes analyzable under the same isolated runtime.",
  },
  {
    q: "How long does analysis take?",
    a: "Most repos finish in under a minute. Larger codebases scale with file count. The map starts appearing within the first few hundred milliseconds.",
  },
  {
    q: "What languages are supported?",
    a: "40+ languages and frameworks: TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, PHP, C/C++, C#, Swift, Kotlin, Elixir, and more.",
  },
];

export default function FAQSnippet() {
  const [open, setOpen] = useState(0);
  return (
    <section className="relative z-[1] py-28 md:py-32 landing-section-x">
      <div className="max-w-[1240px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <h2
              className="font-semibold tracking-[-0.024em] leading-[1.04] mb-4"
              style={{ fontSize: "clamp(34px, 4vw, 48px)", color: "var(--c-text)" }}
            >
              Questions{" "}
              <span className="text-c-accent">engineers ask first.</span>
            </h2>
            <p
              className="text-[14px] leading-[1.65] max-w-[300px]"
              style={{ color: "var(--c-text-2)" }}
            >
              Straight answers before you pay for a tool.
            </p>
          </div>
          <div className="lg:col-span-8">
            <ul className="border-t" style={{ borderColor: "var(--c-line)" }}>
              {QUESTIONS.map((item, i) => {
                const isOpen = open === i;
                return (
                  <li
                    key={i}
                    className="border-b"
                    style={{ borderColor: "var(--c-line)" }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      className="w-full flex items-center justify-between gap-6 py-5 text-left btn-press"
                      aria-expanded={isOpen}
                    >
                      <span
                        className="text-[15px] md:text-[16px] tracking-[-0.005em] font-medium"
                        style={{
                          color: isOpen ? "var(--c-text)" : "var(--c-text-2)",
                          transition: "color 200ms cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      >
                        {item.q}
                      </span>
                      <Plus
                        size={15}
                        className="flex-shrink-0"
                        style={{
                          color: isOpen ? "var(--c-accent)" : "var(--c-text-3)",
                          transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                          transition: "transform 220ms cubic-bezier(0.16, 1, 0.3, 1), color 200ms cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      />
                    </button>
                    <div
                      className={`faq-accordion-panel ${isOpen ? "faq-accordion-panel--open" : "faq-accordion-panel--closed"}`}
                    >
                      <div className="faq-accordion-inner">
                        <p
                          className="faq-accordion-body pb-5 pr-10 text-[14px] leading-[1.65] max-w-[640px]"
                          style={{ color: "var(--c-text-2)" }}
                        >
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
