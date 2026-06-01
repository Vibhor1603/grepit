"use client";

import { useId } from "react";

/** Original bolt geometry — unchanged. */
export const BOLT_PATH =
  "M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z";

export function ViboMark({ size = 24, className = "" }) {
  const gradId = `grepit-mark-grad-${useId().replace(/:/g, "")}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size * (46 / 48)}
      viewBox="0 0 48 46"
      fill="none"
      className={className}
      aria-hidden="true"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id={gradId} x1="14" y1="4" x2="34" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--c-accent-bright)" />
          <stop offset="55%" stopColor="var(--c-accent)" />
          <stop offset="100%" stopColor="var(--c-accent-dim)" />
        </linearGradient>
      </defs>
      <path d={BOLT_PATH} fill={`url(#${gradId})`} />
      <path
        d={BOLT_PATH}
        fill="none"
        stroke="var(--c-accent-line)"
        strokeWidth="0.85"
        strokeLinejoin="round"
        opacity="0.55"
      />
      {/* Subtle green tip — minimal brand accent */}
      <circle cx="38" cy="8" r="2.2" fill="var(--c-lime)" opacity="0.88" />
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
