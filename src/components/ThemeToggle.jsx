"use client";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

/**
 * ThemeToggle — sun/moon crossfade on the control only; page theme swaps via View Transition or instant.
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
          "background-color var(--dur-hover) var(--ease-out-strong), color var(--dur-hover) var(--ease-out-strong), border-color var(--dur-hover) var(--ease-out-strong), transform var(--dur-press) var(--ease-out-strong)",
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
          transition: "opacity var(--dur-theme) var(--ease-out-strong)",
        }}
        aria-hidden={!isDark}
      >
        <Moon size={14} strokeWidth={1.8} />
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: isDark ? 0 : 1,
          transition: "opacity var(--dur-theme) var(--ease-out-strong)",
        }}
        aria-hidden={isDark}
      >
        <Sun size={14} strokeWidth={1.8} />
      </span>
    </button>
  );
}
