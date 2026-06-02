"use client";
import TiltCard from "./TiltCard";

/**
 * Homepage card — contact shadow, 3D tilt, single hairline border (no double ring).
 * @param {"default" | "elevated" | "flat"} depth — shadow stack + rest float height
 * @param {boolean} hero — stronger panel contrast + float shadow (topology card)
 */
export default function HomeCard({
  children,
  className = "",
  style,
  maxTilt = 12,
  depth = "default",
  hero = false,
  interactive = true,
  ...rest
}) {
  const depthClass =
    depth === "elevated"
      ? "home-card-surface home-card-surface--elevated"
      : depth === "flat"
        ? ""
        : "home-card-surface";

  const heroClass = hero ? "home-card-surface--hero" : "";
  const perspectiveClass = hero ? "home-card-tilt-perspective--hero" : "";

  return (
    <TiltCard
      maxTilt={maxTilt}
      interactive={interactive && depth !== "flat"}
      perspectiveClassName={perspectiveClass}
      className={`${depthClass} ${heroClass} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </TiltCard>
  );
}
