"use client";

/**
 * Infinite horizontal marquee. Content must be duplicated inside the track.
 * Uses CSS class `.marquee-track` (keyframes defined in index.css).
 */
export default function MarqueeTrack({
  children,
  reverse = false,
  duration = "70s",
  className = "",
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        className={reverse ? "marquee-track marquee-track--reverse" : "marquee-track"}
        style={{ animationDuration: duration }}
      >
        {children}
      </div>
    </div>
  );
}
