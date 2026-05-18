"use client";
import { useRef, useEffect, useCallback } from 'react';

/**
 * Interactive code-graph background — fixed, full-page.
 * Renders floating nodes connected by proximity lines on a canvas.
 * Nodes drift slowly; connections glow in accent color when the cursor is near.
 */
export default function GridBackground() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animRef = useRef(null);
  const nodesRef = useRef([]);
  const dprRef = useRef(1);

  const initNodes = useCallback((width, height) => {
    const count = Math.min(Math.floor((width * height) / 14000), 100);
    const nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 1.8 + 0.8,
        important: Math.random() < 0.18,
      });
    }
    nodesRef.current = nodes;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNodes(window.innerWidth, window.innerHeight);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleLeave = () => { mouseRef.current = { x: -1000, y: -1000 }; };

    window.addEventListener('mousemove', handleMouse);
    document.addEventListener('mouseleave', handleLeave);

    const CONNECT_DIST = 140;
    const MOUSE_RADIUS = 200;

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;
      const mouse = mouseRef.current;

      // Update positions
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;
        node.x = Math.max(0, Math.min(w, node.x));
        node.y = Math.max(0, Math.min(h, node.y));
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const midX = (nodes[i].x + nodes[j].x) / 2;
            const midY = (nodes[i].y + nodes[j].y) / 2;
            const mouseDist = Math.sqrt((midX - mouse.x) ** 2 + (midY - mouse.y) ** 2);
            const mouseInfluence = Math.max(0, 1 - mouseDist / MOUSE_RADIUS);
            const baseAlpha = (1 - dist / CONNECT_DIST) * 0.08;
            const alpha = baseAlpha + mouseInfluence * 0.25;

            if (mouseInfluence > 0) {
              ctx.strokeStyle = `rgba(224, 252, 16, ${alpha})`;
            } else {
              ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            }
            ctx.lineWidth = mouseInfluence > 0 ? 1 : 0.5;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const mouseDist = Math.sqrt((node.x - mouse.x) ** 2 + (node.y - mouse.y) ** 2);
        const mouseInfluence = Math.max(0, 1 - mouseDist / MOUSE_RADIUS);
        const baseAlpha = node.important ? 0.4 : 0.18;
        const alpha = baseAlpha + mouseInfluence * 0.55;
        const radius = node.radius + mouseInfluence * 2;

        if (mouseInfluence > 0.1) {
          ctx.shadowColor = 'rgba(224, 252, 16, 0.5)';
          ctx.shadowBlur = 10 * mouseInfluence;
          ctx.fillStyle = `rgba(224, 252, 16, ${alpha})`;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = node.important
            ? `rgba(224, 252, 16, ${alpha})`
            : `rgba(255, 255, 255, ${alpha})`;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, [initNodes]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.8 }}
      aria-hidden="true"
    />
  );
}
