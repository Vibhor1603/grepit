"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Segmented tab control with a sliding pill — interruptible spring motion.
 * Labels hide below xl so the bar fits tablet / small laptop widths.
 */
export default function DashboardTabs({ tabs, activeTab, onChange, className = "" }) {
  const containerRef = useRef(null);
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ x: 0, width: 0 });

  const syncIndicator = () => {
    const el = tabRefs.current[activeTab];
    if (!el) return;
    setIndicator({ x: el.offsetLeft, width: el.offsetWidth });
  };

  useEffect(() => {
    syncIndicator();
  }, [activeTab]);

  useEffect(() => {
    const onResize = () => syncIndicator();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center max-w-full bg-c-overlay-1 border border-c-line rounded-[20px] p-[4px] shrink-0 ${className}`}
    >
      <motion.div
        aria-hidden="true"
        className="absolute top-[4px] bottom-[4px] rounded-[14px] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--c-lime-soft) 75%, var(--c-surface) 25%), color-mix(in srgb, var(--c-accent-soft) 45%, var(--c-surface) 55%))",
          boxShadow:
            "inset 0 0 0 1px var(--c-accent-line), inset 0 -2px 0 color-mix(in srgb, var(--c-accent) 55%, transparent), 0 8px 20px rgba(0,0,0,0.16)",
          left: 0,
        }}
        animate={{ x: indicator.x, width: indicator.width }}
        transition={{ type: "spring", duration: 0.46, bounce: 0.1 }}
      />
      {tabs.map(({ id, Icon, label }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            ref={(node) => {
              tabRefs.current[id] = node;
            }}
            type="button"
            onClick={() => onChange(id)}
            title={label}
            className={`relative z-[1] flex items-center justify-center gap-1.5 px-4 sm:px-4.5 xl:px-5 py-2 rounded-[14px] text-[13px] xl:text-[13.5px] font-medium min-w-[6.5rem] ${
              active ? "text-c-text" : "text-c-text-2 hover:text-c-text"
            }`}
            style={{
              transition: "color 180ms var(--ease-out-strong)",
            }}
          >
            <Icon
              size={15}
              strokeWidth={active ? 2.2 : 1.75}
              className={`flex-shrink-0 ${active ? "text-c-lime" : ""}`}
            />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
