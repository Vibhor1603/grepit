"use client";
import { Link2, Upload } from "lucide-react";

/**
 * Segmented control: GitHub URL | Upload — subtle, macOS-leaning.
 */
export default function InputModeSwitch({ mode, setMode }) {
  const isUrl = mode === "url";

  return (
    <div className="input-mode-switch" role="tablist" aria-label="Input mode">
      <span
        className="input-mode-indicator"
        aria-hidden
        style={{
          transform: isUrl ? "translateX(0)" : "translateX(calc(100% + 2px))",
        }}
      />

      <ModeTab
        active={isUrl}
        onClick={() => setMode("url")}
        icon={Link2}
        label="URL"
      />
      <ModeTab
        active={!isUrl}
        onClick={() => setMode("upload")}
        icon={Upload}
        label="Upload"
      />
    </div>
  );
}

function ModeTab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`input-mode-tab${active ? " input-mode-tab--active" : ""}`}
    >
      <Icon size={12} strokeWidth={2} aria-hidden />
      {label}
    </button>
  );
}
