"use client";
import Link from "next/link";
import { ViboMark } from "../ViboLogo";

const COLUMNS = [
  {
    label: "Product",
    links: [
      ["Pricing",       "/#pricing"],
      ["FAQ",           "/faq"],
      ["Transparency",  "/transparency"],
    ],
  },
  {
    label: "Legal",
    links: [
      ["Privacy",  "/privacy"],
      ["Terms",    "/terms"],
      ["Refunds",  "/refund"],
    ],
  },
  {
    label: "Connect",
    links: [
      ["Sign in",       "/sign-in"],
      ["Get started",   "/sign-in?mode=signup"],
      ["Contact",       "mailto:support@grepit.co"],
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer
      className="relative z-[1] border-t"
      style={{ backgroundColor: "var(--c-bg-deep)", borderColor: "var(--c-line)" }}
    >
      <div className="max-w-[1240px] mx-auto landing-section-x pt-20 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-12 md:gap-8 mb-16">
          <div className="col-span-2 md:col-span-5 max-w-[420px]">
            <div className="flex items-center gap-2 mb-5">
              <ViboMark size={20} />
              <span
                className="text-[16px] font-semibold tracking-tight select-none"
                style={{ color: "var(--c-text)" }}
              >
                grep<span style={{ color: "var(--c-accent)" }}>it</span>
              </span>
            </div>
            <p
              className="text-[13.5px] leading-[1.6] mb-5"
              style={{ color: "var(--c-text-2)" }}
            >
              Understand any codebase in minutes. Paste a repository, see the system.
            </p>
            <p
              className="font-mono text-[10.5px]"
              style={{ color: "var(--c-text-3)" }}
            >
              {new Date().getFullYear()}
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.label} className="col-span-1 md:col-span-2">
              <p
                className="font-mono text-[10.5px] uppercase tracking-[0.16em] mb-4"
                style={{ color: "var(--c-text-3)" }}
              >
                {col.label}
              </p>
              <ul className="space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    {href.startsWith("mailto:") ? (
                      <a
                        href={href}
                        className="text-[13px]"
                        style={{
                          color: "var(--c-text-2)",
                          transition: "color 160ms var(--ease-out-strong)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-text)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text-2)")}
                      >
                        {label}
                      </a>
                    ) : (
                      <Link
                        href={href}
                        className="text-[13px]"
                        style={{
                          color: "var(--c-text-2)",
                          transition: "color 160ms var(--ease-out-strong)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-text)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text-2)")}
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-7 border-t font-mono text-[10.5px]"
          style={{ borderColor: "var(--c-line)", color: "var(--c-text-3)" }}
        >
          <span>© {new Date().getFullYear()} grepit · all rights reserved</span>
          <a
            href="mailto:support@grepit.co"
            className="text-[11px]"
            style={{
              color: "var(--c-text-2)",
              transition: "color 160ms var(--ease-out-strong)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text-2)")}
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
