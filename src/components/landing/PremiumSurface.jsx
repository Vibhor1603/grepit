"use client";

/**
 * PremiumSurface — depth via shadow + lift. No colored glow.
 * Emil: exact transition properties, hover gated to fine pointer.
 */
export default function PremiumSurface({ children, className = "", style, ...rest }) {
  return (
    <div
      className={`premium-surface ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}
