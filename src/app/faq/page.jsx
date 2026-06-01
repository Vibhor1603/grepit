"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import { ViboMark } from "../../components/ViboLogo";

const FAQ_GROUPS = [
  {
    label: "Product",
    items: [
      {
        q: "What is grepit?",
        a: "An intelligent spatial environment for understanding software architecture. Paste a GitHub URL and grepit returns a navigable architecture map, a Start Here onboarding traversal, an operational health report, and answers grounded in the source, citing the file and line every time. Public or private repositories.",
      },
      {
        q: "Is my code stored?",
        a: "Source code is processed in isolated, short-lived serverless workers to extract structural intelligence (graphs, snippets needed for grounded answers, security findings). We keep only the minimum derived data needed for product features, scoped to your account. Temporary caches purge within 24 hours.",
      },
      {
        q: "Does it work with private repos?",
        a: "Yes. Connect GitHub once via OAuth from your profile to grant access. We request only the minimum read scope needed for analysis. You can revoke access at any time from GitHub settings.",
      },
      {
        q: "What languages are supported?",
        a: "40+ languages and frameworks parsed at AST level: TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Ruby, PHP, C/C++, C#, Swift, Elixir, Scala, Dart, Lua, Haskell, Bash. Framework-aware parsing for Next.js, React, Vue, Svelte, Django, Rails, Flutter and more.",
      },
      {
        q: "How long does analysis take?",
        a: "Most repositories complete in under a minute. The architecture map starts emerging within the first few hundred milliseconds. Larger codebases scale linearly with file count.",
      },
    ],
  },
  {
    label: "Billing",
    items: [
      {
        q: "Is there a free plan?",
        a: "Yes. The Free plan includes 2 repositories with 150K tokens per day. No credit card required.",
      },
      {
        q: "How do I cancel my subscription?",
        a: "Profile → Cancel. The subscription cancels immediately, and you retain access to paid features until the end of the current billing period. No further charges.",
      },
      {
        q: "Can I upgrade or downgrade anytime?",
        a: "Yes. Upgrades take effect immediately, prorated for the remainder of the cycle. Downgrades take effect at the start of the next cycle.",
      },
      {
        q: "Can I get a refund?",
        a: "Refunds may be issued within 48 hours of your first subscription if the Service does not work as described. After that window, refunds for partial periods aren't issued. See the Refund Policy for full details.",
      },
      {
        q: "What payment methods do you accept?",
        a: "Credit/debit cards, UPI, and netbanking via Dodo Payments. All payments processed securely through Dodo's payment infrastructure.",
      },
    ],
  },
  {
    label: "Security",
    items: [
      {
        q: "How secure is my data?",
        a: "TLS 1.2+ in transit. Raw source is not persisted long-term. Access controls and encrypted databases for stored intelligence. Infrastructure providers maintain SOC 2 compliance. See the Privacy Policy for full details.",
      },
    ],
  },
];

function Item({ q, a, isOpen, onToggle }) {
  return (
    <li className="border-b" style={{ borderColor: "var(--c-line)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-6 py-5 text-left"
      >
        <span
          className="text-[15px] tracking-[-0.005em] font-medium"
          style={{
            color: isOpen ? "var(--c-text)" : "var(--c-text-2)",
            transition: "color 200ms var(--ease-out-strong)",
          }}
        >
          {q}
        </span>
        <Plus
          size={15}
          className="flex-shrink-0"
          style={{
            color: "var(--c-text-3)",
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
            transition: "transform 220ms cubic-bezier(0.23,1,0.32,1)",
          }}
        />
      </button>
      <div
        style={{
          maxHeight: isOpen ? "300px" : "0px",
          opacity: isOpen ? 1 : 0,
          overflow: "hidden",
          transition:
            "max-height 320ms cubic-bezier(0.23,1,0.32,1), opacity 220ms cubic-bezier(0.23,1,0.32,1)",
        }}
      >
        <p
          className="pb-5 pr-10 text-[14px] leading-[1.65] max-w-[720px]"
          style={{ color: "var(--c-text-2)" }}
        >
          {a}
        </p>
      </div>
    </li>
  );
}

export default function FAQPage() {
  const [open, setOpen] = useState({});
  const toggle = (key) => setOpen((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--c-bg)", color: "var(--c-text)" }}
    >
      <div
        className="px-6 md:px-10 lg:px-14 py-5 border-b sticky top-0 z-50"
        style={{
          borderColor: "var(--c-vibrancy-edge)",
          backgroundColor: "var(--c-vibrancy)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
        }}
      >
        <div className="max-w-[1240px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ViboMark size={18} />
            <span
              className="text-[15px] font-semibold tracking-tight select-none"
              style={{ color: "var(--c-text)" }}
            >
              grep<span style={{ color: "var(--c-accent)" }}>it</span>
            </span>
          </Link>
          <Link
            href="/"
            className="font-mono text-[11.5px] uppercase tracking-[0.14em] flex items-center gap-1.5"
            style={{
              color: "var(--c-text-2)",
              transition: "color 160ms var(--ease-out-strong)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text-2)")}
          >
            <ArrowLeft size={12} />
            Back home
          </Link>
        </div>
      </div>

      <main className="max-w-[1240px] mx-auto px-6 md:px-10 lg:px-14 pt-20 lg:pt-28 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
          <div className="lg:col-span-5">
            <h1
              className="font-semibold tracking-[-0.024em] leading-[1.02] mb-5"
              style={{ fontSize: "clamp(36px, 4.4vw, 56px)", color: "var(--c-text)" }}
            >
              Questions{" "}
              <span className="text-c-accent">engineers ask first.</span>
            </h1>
            <p
              className="text-[14.5px] leading-[1.65] max-w-[420px]"
              style={{ color: "var(--c-text-2)" }}
            >
              The questions you'd want answered before paying for a tool. Can't find one?
              Reach{" "}
              <a
                href="mailto:support@grepit.co"
                style={{ color: "var(--c-accent)" }}
              >
                support@grepit.co
              </a>
              .
            </p>
          </div>
          <div className="lg:col-span-7">
            <div className="space-y-12">
              {FAQ_GROUPS.map((group) => (
                <div key={group.label}>
                  <p
                    className="font-mono text-[10.5px] uppercase tracking-[0.16em] mb-3"
                    style={{ color: "var(--c-accent)" }}
                  >
                    {group.label}
                  </p>
                  <ul className="border-t" style={{ borderColor: "var(--c-line)" }}>
                    {group.items.map((item, i) => {
                      const key = `${group.label}-${i}`;
                      return (
                        <Item
                          key={key}
                          q={item.q}
                          a={item.a}
                          isOpen={!!open[key]}
                          onToggle={() => toggle(key)}
                        />
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
