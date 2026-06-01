"use client";

/**
 * Fixed graph-paper layer behind landing content (fine + major grid).
 */
export default function LandingBackdrop() {
  return (
    <div className="landing-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="landing-backdrop-graph" />
      <div className="landing-backdrop-vignette" />
    </div>
  );
}
