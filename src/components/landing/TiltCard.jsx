"use client";
import { useEffect, useRef } from "react";

const LERP = 0.14;
const PERSPECTIVE = 1050;
const REST_ROT_X = 0;
const REST_ROT_Y = 0;
const REST_LIFT_PX = -4;
const REST_Z_PX = 8;
const HOVER_LIFT_EXTRA_PX = -15;
const HOVER_Z_EXTRA_PX = 36;

/** 3D tilt + contact shadow + moving specular — reads as a floating physical panel. */
export default function TiltCard({
  children,
  className = "",
  perspectiveClassName = "",
  style,
  maxTilt = 12,
  interactive = true,
  ...rest
}) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const groundRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    const ground = groundRef.current;
    if (!wrap || !inner || !interactive) return;

    const isFinePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!isFinePointer || reduceMotion) return;
    const effectiveMaxTilt = maxTilt * 1.32;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let targetHover = 0;
    let currentHover = 0;

    const onMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      targetX = (px - 0.5) * 2;
      targetY = (py - 0.5) * 2;
      targetHover = 1;

    };

    const onEnter = () => {
      targetHover = 1;
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      targetHover = 0;
    };

    const tick = () => {
      currentX += (targetX - currentX) * LERP;
      currentY += (targetY - currentY) * LERP;
      currentHover += (targetHover - currentHover) * LERP;

      const rotY = REST_ROT_Y + currentX * effectiveMaxTilt;
      const rotX = REST_ROT_X + -currentY * effectiveMaxTilt;
      const lift = REST_LIFT_PX + currentHover * HOVER_LIFT_EXTRA_PX;
      const z = REST_Z_PX + currentHover * HOVER_Z_EXTRA_PX;

      inner.style.transform = `translate3d(0, ${lift.toFixed(2)}px, ${z.toFixed(1)}px) rotateX(${rotX.toFixed(3)}deg) rotateY(${rotY.toFixed(3)}deg)`;

      if (ground) {
        // Make shadow displacement/weight track tilt more aggressively.
        const motion = Math.hypot(currentX, currentY);
        const shadowX = (-4 + currentX * 32).toFixed(1);
        const groundScale = 0.74 + currentHover * 0.24 + motion * 0.09;
        const groundY = 9 + currentHover * 24 + currentY * 12;
        const groundOpacity = Math.min(1, 0.72 + currentHover * 0.34 + motion * 0.12);

        ground.style.transform = `translate3d(${shadowX}px, ${groundY}px, 0) scaleX(${groundScale.toFixed(3)}) scaleY(${(groundScale * 0.58).toFixed(3)})`;
        ground.style.opacity = groundOpacity.toFixed(3);
      }

      raf = requestAnimationFrame(tick);
    };

    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      wrap.removeEventListener("pointerenter", onEnter);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      inner.style.transform = "";
      if (ground) {
        ground.style.transform = "";
        ground.style.opacity = "";
      }
    };
  }, [maxTilt, interactive]);

  return (
    <div
      ref={wrapRef}
      className={`home-card-tilt-perspective relative${interactive ? " home-card-tilt-perspective--interactive" : ""}${perspectiveClassName ? ` ${perspectiveClassName}` : ""}`}
      style={{ perspective: `${PERSPECTIVE}px`, perspectiveOrigin: "50% 40%" }}
    >
      {interactive ? <div ref={groundRef} className="home-card-ground-shadow" aria-hidden /> : null}
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
