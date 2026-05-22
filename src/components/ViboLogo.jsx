"use client";

/**
 * grepit brand logo — lightning bolt mark + wordmark.
 * Sizes: "sm" (nav), "md" (footer/default), "lg" (hero).
 */
export function ViboMark({ size = 20, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size * (46 / 48)}
      viewBox="0 0 48 46"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="url(#grepit-mark-grad)"
        d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
      />
      <defs>
        <linearGradient id="grepit-mark-grad" x1="24" y1="0" x2="24" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0FC10" />
          <stop offset="1" stopColor="#b8d00e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ViboWordmark({ className = "" }) {
  return (
    <span className={`font-semibold tracking-tight select-none ${className}`}>
      grep<span className="text-vb-accent">it</span>
    </span>
  );
}

export function ViboLogo({ size = "md", className = "", showMark = true }) {
  const sizes = {
    sm: { mark: 16, text: "text-[16px]", gap: "gap-1.5" },
    md: { mark: 20, text: "text-[18px]", gap: "gap-2" },
    lg: { mark: 26, text: "text-[22px]", gap: "gap-2.5" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {showMark && <ViboMark size={s.mark} />}
      <ViboWordmark className={s.text} />
    </div>
  );
}

export default ViboLogo;
