"use client";
import { useEffect, useRef } from "react";

/**
 * CursorConstellation — subtle trailing nodes + hairline connections.
 *
 * Replaces the large radial spotlight. Three tiny orbs (gold, lime, sage)
 * lag behind the cursor at different speeds. Faint lines link them when
 * close enough. Minimal footprint, high craft — matches DESIGN.md cursor system.
 */
export default function CursorConstellation() {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    mx: -999,
    my: -999,
    active: false,
    nodes: [
      { x: -999, y: -999, tx: -999, ty: -999, speed: 0.22, r: 3.5, color: "var(--c-accent)" },
      { x: -999, y: -999, tx: -999, ty: -999, speed: 0.14, r: 2.5, color: "var(--c-accent-bright)" },
      { x: -999, y: -999, tx: -999, ty: -999, speed: 0.08, r: 2, color: "var(--c-accent-dim)" },
    ],
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const fine = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    let raf = 0;
    let colors = { accent: "#EEC679", accentBright: "#EEC679", accentDim: "#C47A12" };

    const resolveColors = () => {
      const s = getComputedStyle(document.documentElement);
      colors = {
        accent: s.getPropertyValue("--c-accent").trim() || colors.accent,
        accentBright: s.getPropertyValue("--c-accent-bright").trim() || colors.accentBright,
        accentDim: s.getPropertyValue("--c-accent-dim").trim() || colors.accentDim,
      };
      stateRef.current.nodes[0].color = colors.accent;
      stateRef.current.nodes[1].color = colors.accentBright;
      stateRef.current.nodes[2].color = colors.accentDim;
    };
    resolveColors();

    const obs = new MutationObserver(resolveColors);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e) => {
      const s = stateRef.current;
      s.mx = e.clientX;
      s.my = e.clientY;
      s.active = true;
      s.nodes.forEach((n) => {
        n.tx = e.clientX;
        n.ty = e.clientY;
      });
    };
    const onLeave = () => {
      stateRef.current.active = false;
    };

    const tick = () => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (s.active) {
        s.nodes.forEach((n) => {
          n.x += (n.tx - n.x) * n.speed;
          n.y += (n.ty - n.y) * n.speed;
        });

        // Hairline connections between trailing nodes
        for (let i = 0; i < s.nodes.length - 1; i++) {
          const a = s.nodes[i];
          const b = s.nodes[i + 1];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = colors.accentDim;
            ctx.globalAlpha = 0.12 + (1 - dist / 120) * 0.1;
            ctx.lineWidth = 0.75;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }

        // Cursor crosshair — two thin lines, very faint
        ctx.strokeStyle = colors.accent;
        ctx.globalAlpha = 0.06;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(s.mx - 18, s.my);
        ctx.lineTo(s.mx + 18, s.my);
        ctx.moveTo(s.mx, s.my - 18);
        ctx.lineTo(s.mx, s.my + 18);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Trailing orbs
        s.nodes.forEach((n, i) => {
          const alpha = i === 0 ? 0.55 : i === 1 ? 0.4 : 0.28;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fillStyle = n.color;
          ctx.globalAlpha = alpha;
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      }

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      obs.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{ mixBlendMode: "normal" }}
    />
  );
}
