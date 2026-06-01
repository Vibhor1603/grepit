"use client";
import { useEffect, useRef } from "react";

const LERP = 0.075;
const PERSPECTIVE = 960;

/** Restrained 3D tilt — no cursor glow or radial shade overlay. */
export default function TiltCard({
  children,
  className = "",
  style,
  maxTilt = 5,
  ...rest
}) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    const isFinePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!isFinePointer || reduceMotion) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      targetX = (px - 0.5) * 2;
      targetY = (py - 0.5) * 2;
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    const tick = () => {
      currentX += (targetX - currentX) * LERP;
      currentY += (targetY - currentY) * LERP;

      const rotY = currentX * maxTilt;
      const rotX = -currentY * maxTilt;
      inner.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;

      raf = requestAnimationFrame(tick);
    };

    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      inner.style.transform = "";
    };
  }, [maxTilt]);

  return (
    <div
      ref={wrapRef}
      className="home-card-tilt-perspective relative"
      style={{ perspective: `${PERSPECTIVE}px`, perspectiveOrigin: "50% 50%" }}
    >
      <div
        ref={innerRef}
        className={`home-card-tilt-inner relative ${className}`}
        style={{
          transformStyle: "preserve-3d",
          willChange: "transform",
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
}
