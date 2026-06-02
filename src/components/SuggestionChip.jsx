"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";

/**
 * Tappable suggestion — accent affordances so it reads as "try this", not body copy.
 */
export default function SuggestionChip({ children, onClick, disabled = false, className = "", style }) {
  const label = typeof children === "string" ? children : "";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`suggestion-chip ${className}`.trim()}
      style={style}
    >
      <Sparkles size={11} strokeWidth={2.25} className="suggestion-chip__icon" aria-hidden />
      <span className="suggestion-chip__text">{children}</span>
      <ArrowUpRight size={11} strokeWidth={2.25} className="suggestion-chip__arrow" aria-hidden />
      <span className="suggestion-chip__shine" aria-hidden />
    </button>
  );
}
