"use client";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

/**
 * ThemeToggle — quiet sun/moon swap, macOS-style.
 *
 * Emil principles applied:
 *   - exact transitions (no `transition: all`)
 *   - custom ease-out curve (--ease-out-strong)
 *   - subtle press feedback (handled globally on `button:active`)
 *   - no entrance animation — it's a control, not decoration
 */
export default function ThemeToggle({ className = "" }) {
  const { resolved, setTheme } = useTheme();
  const isDark = resolved === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative inline-flex items-center justify-center h-8 w-8 rounded-full border ${className}`}
      style={{
        backgroundColor: "var(--c-surface-2)",
        borderColor: "var(--c-line)",
        color: "var(--c-text-2)",
        transition:
          "background-color var(--dur-flow) var(--ease-drawer), color var(--dur-flow) var(--ease-drawer), border-color var(--dur-flow) var(--ease-drawer), transform 140ms var(--ease-out-strong)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--c-text)";
        e.currentTarget.style.borderColor = "var(--c-line-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--c-text-2)";
        e.currentTarget.style.borderColor = "var(--c-line)";
      }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? "scale(1) rotate(0deg)" : "scale(0.92) rotate(-24deg)",
          transition:
            "opacity 320ms var(--ease-drawer), transform 320ms var(--ease-drawer)",
        }}
      >
        <Moon size={14} strokeWidth={1.8} />
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? "scale(0.92) rotate(24deg)" : "scale(1) rotate(0deg)",
          transition:
            "opacity 320ms var(--ease-drawer), transform 320ms var(--ease-drawer)",
        }}
      >
        <Sun size={14} strokeWidth={1.8} />
      </span>
    </button>
  );
}
