"use client";
import { useEffect, useRef } from "react";

const PAPER = {
  dark: { bg: "#111511", edge: "rgba(238, 198, 121, 0.05)" },
  light: { bg: "#FAF8F2", edge: "rgba(64, 67, 59, 0.06)" },
};

const ORIGIN = "92% 7%";
const DURATION = 420;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

function applyClass(resolved) {
  const root = document.documentElement;
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

/**
 * Theme peel — old palette collapses into the toggle (radial) while new theme shows.
 */
export default function ThemeTransitionOverlay({ fromTheme, toTheme, onComplete }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || !fromTheme || !toTheme) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      applyClass(toTheme);
      onComplete?.();
      return;
    }

    const root = document.documentElement;
    root.classList.add("theme-transitioning");
    applyClass(toTheme);

    const anim = sheet.animate(
      [
        {
          clipPath: `circle(150% at ${ORIGIN})`,
          transform: "scale(1) translateX(0)",
          filter: "blur(0px)",
          opacity: 1,
        },
        {
          clipPath: `circle(85% at ${ORIGIN})`,
          transform: "scale(1.008) translateX(0.5%)",
          filter: "blur(0px)",
          opacity: 1,
          offset: 0.35,
        },
        {
          clipPath: `circle(0% at ${ORIGIN})`,
          transform: "scale(1.015) translateX(1%)",
          filter: "blur(1.5px)",
          opacity: 0.96,
        },
      ],
      {
        duration: DURATION,
        easing: EASE,
        fill: "forwards",
      },
    );

    const done = () => {
      root.classList.remove("theme-transitioning");
      onComplete?.();
    };

    anim.onfinish = done;
    anim.oncancel = done;

    return () => anim.cancel();
  }, [fromTheme, toTheme, onComplete]);

  if (!fromTheme) return null;

  const paper = PAPER[fromTheme] ?? PAPER.dark;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] pointer-events-none theme-peel-root"
    >
      <div
        ref={sheetRef}
        className="absolute inset-0 theme-peel-sheet"
        style={{
          backgroundColor: paper.bg,
          backgroundImage: `radial-gradient(circle, ${paper.edge} 1px, transparent 1px)`,
          backgroundSize: "18px 18px",
          boxShadow: "0 0 48px rgba(0,0,0,0.08)",
        }}
      />
    </div>
  );
}
