"use client";
import TiltCard from "./TiltCard";

const SOLID_SURFACE = {
  backgroundColor: "var(--c-surface)",
};

/**
 * Homepage card — solid surface, whole card tilts over page background.
 */
export default function HomeCard({
  children,
  className = "",
  style,
  maxTilt = 16,
  ...rest
}) {
  return (
    <TiltCard
      maxTilt={maxTilt}
      className={className}
      style={{ ...SOLID_SURFACE, ...style }}
      {...rest}
    >
      {children}
    </TiltCard>
  );
}
