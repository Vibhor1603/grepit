"use client";

import { useId } from "react";

/** Original bolt geometry — unchanged. */
export const BOLT_PATH =
  "M26.8 44.85c-.65.82-1.95.38-1.95-.72V33.6a2.1 2.1 0 0 0-2.1-2.1H11.3c-.88 0-1.4-1-.88-1.72L18.1 19.1c1.02-1.45 0-3.45-1.75-3.45H2.4c-.88 0-1.4-1-.88-1.72L11.15 1.35c.22-.3.55-.48.92-.48h27.8c.88 0 1.4 1 .88 1.72l-7.15 10.35c-1.02 1.45 0 3.45 1.75 3.45h10.6c.9 0 1.4 1.05.85 1.78L26.8 44.85z";

export function ViboMark({ size = 24, className = "" }) {
  const gradId = `grepit-logo-grad-${useId().replace(/:/g, "")}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-0.7 -0.7 49.4 47.4"
      width={size}
      height={size * (46 / 48)}
      fill="none"
      aria-label="grepit logo"
      className={className}
      shapeRendering="geometricPrecision"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="12" y1="6" x2="36" y2="41" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFEEB8" />
          <stop offset="38%" stopColor="#F9C96F" />
          <stop offset="65%" stopColor="#E89F2E" />
          <stop offset="100%" stopColor="#C87A15" />
        </linearGradient>
      </defs>

      <path
        d={BOLT_PATH}
        fill={`url(#${gradId})`}
        stroke="#2A2218"
        strokeWidth="0.9"
        strokeLinejoin="round"
        paintOrder="stroke fill"
      />
    </svg>
  );
}

export function ViboWordmark({ className = "", size = "md" }) {
  const scale = {
    sm: { text: "text-[17px]", tracking: "tracking-[-0.04em]" },
    md: { text: "text-[19px]", tracking: "tracking-[-0.035em]" },
    lg: { text: "text-[23px]", tracking: "tracking-[-0.03em]" },
  };
  const s = scale[size] || scale.md;

  return (
    <span
      className={`inline-flex items-baseline leading-none font-semibold select-none ${s.text} ${s.tracking} ${className}`}
      style={{
        fontFeatureSettings: '"kern" 1, "liga" 1',
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <span style={{ color: "var(--c-text)" }}>grep</span>
      <span style={{ color: "var(--c-accent)" }}>it</span>
    </span>
  );
}

export function ViboLogo({ size = "md", className = "", showMark = true }) {
  const sizes = {
    sm: { mark: 22, gap: "gap-2" },
    md: { mark: 24, gap: "gap-2.5" },
    lg: { mark: 30, gap: "gap-3" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className={`inline-flex items-center ${s.gap} ${className}`}>
      {showMark && (
        <span className="inline-flex flex-shrink-0 translate-y-[0.5px]">
          <ViboMark size={s.mark} />
        </span>
      )}
      <ViboWordmark size={size} />
    </div>
  );
}

export default ViboLogo;
