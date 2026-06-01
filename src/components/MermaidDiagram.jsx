"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { renderMermaidToSvg } from "../utils/client/mermaid";

export default function MermaidDiagram({ code, allowFullscreen = true }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!code?.trim()) return;
    let cancelled = false;
    setFailed(false);
    setSvg("");

    const render = async () => {
      try {
        const rendered = await renderMermaidToSvg(code);
        if (!cancelled && rendered) setSvg(rendered);
        else if (!cancelled) setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    render();

    const obs = new MutationObserver(() => {
      if (!cancelled) render();
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [code]);

  if (failed) {
    return (
      <div className="rounded-lg border border-c-line bg-c-overlay-1 overflow-x-auto">
        <pre className="text-[12px] font-mono text-vb-ink2 whitespace-pre p-4">{code}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-lg border border-c-line bg-c-overlay-1 flex items-center gap-2 p-4">
        <svg className="w-4 h-4 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-[12px] text-vb-ink3">Rendering diagram…</span>
      </div>
    );
  }

  const diagramContent = (
    <div
      ref={containerRef}
      className="vb-diagram [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:mx-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );

  if (fullscreen && allowFullscreen) {
    const scaledSvg = svg
      .replace(/<svg([^>]*?)width="[^"]*"/, "<svg$1")
      .replace(/height="[^"]*"/, "")
      .replace(/<svg/, '<svg style="width:90vw;max-height:80vh"');
    return (
      <div className="fixed inset-0 z-[250] bg-vb-bg flex flex-col" onClick={() => setFullscreen(false)}>
        <div
          className="flex items-center justify-between px-6 py-3 border-b border-c-line flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[13px] text-vb-ink3">Diagram</span>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="p-1.5 rounded-md text-vb-ink3 hover:text-vb-ink hover:bg-c-overlay-2 transition-colors"
            title="Exit fullscreen"
          >
            <Minimize2 size={15} />
          </button>
        </div>
        <div
          className="flex-1 overflow-auto flex items-center justify-center p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="vb-diagram" dangerouslySetInnerHTML={{ __html: scaledSvg }} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-c-surface overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
      {allowFullscreen && (
        <div className="flex items-center justify-end px-3 py-2 border-b border-c-line gap-2">
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="p-1.5 rounded-md text-vb-ink3 hover:text-vb-ink hover:bg-c-overlay-2 transition-colors"
            title="Fullscreen"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      )}
      <div className="p-4 overflow-x-auto">{diagramContent}</div>
    </div>
  );
}
