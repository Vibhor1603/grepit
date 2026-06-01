import Link from "next/link";
import { ViboMark } from "./ViboLogo";

/**
 * Footer — global footer used on non-landing pages.
 * v5 palette, restrained, infrastructural rhythm.
 */
export default function Footer() {
  return (
    <footer className="border-t border-c-line py-10 px-6 md:px-10 lg:px-14 mt-auto bg-c-bg">
      <div className="max-w-[1240px] mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <ViboMark size={18} />
            <span className="text-[15px] font-semibold tracking-tight text-c-text select-none">
              grep<span className="text-c-accent">it</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2 font-mono text-[11.5px]">
            {[
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
              ["Refunds", "/refund"],
              ["FAQ", "/faq"],
              ["Transparency", "/transparency"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                style={{ transition: "color 160ms var(--ease-out-strong)" }}
                className="text-c-text-2 hover:text-c-text uppercase tracking-[0.14em]"
              >
                {label}
              </Link>
            ))}
            <a
              href="mailto:support@grepit.co"
              style={{ transition: "color 160ms var(--ease-out-strong)" }}
              className="text-c-text-2 hover:text-c-text uppercase tracking-[0.14em]"
            >
              Contact
            </a>
          </div>
        </div>
        <div className="mt-7 pt-6 border-t border-c-line flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-[10.5px] text-c-text-3">
          <span>© {new Date().getFullYear()} grepit · all rights reserved</span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-c-accent" />
            operational
          </span>
        </div>
      </div>
    </footer>
  );
}
