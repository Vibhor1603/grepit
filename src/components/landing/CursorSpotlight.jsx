"use client";
import { useEffect, useRef } from "react";

/**
 * CursorSpotlight — quiet ambient light behind hero content only.
 * z-0, pointer-events none, never uses blend modes.
 */
export default function CursorSpotlight({
  size = 320,
  color = "var(--c-accent-glow)",
  className = "",
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fine = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let active = false;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      tx = e.clientX - rect.left;
      ty = e.clientY - rect.top;
      if (!active) {
        cx = tx;
        cy = ty;
        active = true;
        el.style.opacity = "1";
      }
    };
    const onLeave = () => {
      active = false;
      el.style.opacity = "0";
    };

    const tick = () => {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      el.style.setProperty("--spot-x", `${cx}px`);
      el.style.setProperty("--spot-y", `${cy}px`);
      raf = requestAnimationFrame(tick);
    };

    const parent = el.parentElement;
    parent?.addEventListener("pointermove", onMove);
    parent?.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      parent?.removeEventListener("pointermove", onMove);
      parent?.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      style={{
        opacity: 0,
        transition: "opacity 400ms cubic-bezier(0.23,1,0.32,1)",
        background: `radial-gradient(${size}px circle at var(--spot-x,50%) var(--spot-y,50%), ${color}, transparent 72%)`,
      }}
    />
  );
}
