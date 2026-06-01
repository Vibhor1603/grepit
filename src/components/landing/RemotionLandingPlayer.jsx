"use client";

import { Player } from "@remotion/player";
import { useCallback, useEffect, useRef, useState } from "react";

function readTheme() {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Client-only Remotion embed. Muted autoplay avoids AudioContext user-gesture blocks.
 */
export default function RemotionLandingPlayer({
  component,
  durationInFrames,
  fps,
  width,
  height,
  onReady,
  className,
  style,
}) {
  const [theme, setTheme] = useState(readTheme);
  const cleanupRef = useRef(null);
  const readyRef = useRef(false);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    readyRef.current = false;
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [theme]);

  const markReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady?.();
  }, [onReady]);

  const playerRef = useCallback(
    (node) => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (!node) return;

      const onFrame = () => markReady();
      const onPlay = () => markReady();

      node.addEventListener("frameupdate", onFrame);
      node.addEventListener("play", onPlay);

      const raf = requestAnimationFrame(() => markReady());
      const fallback = setTimeout(() => markReady(), 600);

      cleanupRef.current = () => {
        node.removeEventListener("frameupdate", onFrame);
        node.removeEventListener("play", onPlay);
        cancelAnimationFrame(raf);
        clearTimeout(fallback);
      };
    },
    [markReady],
  );

  return (
    <Player
      ref={playerRef}
      component={component}
      inputProps={{ theme }}
      durationInFrames={durationInFrames}
      fps={fps}
      compositionWidth={width}
      compositionHeight={height}
      style={{ width: "100%", height: "100%", display: "block", ...style }}
      className={className}
      autoPlay
      loop
      controls={false}
      clickToPlay={false}
      spaceKeyToPlayOrPause={false}
      moveToBeginningWhenFinished={false}
      numberOfSharedAudioTags={0}
      initiallyMuted
      noSuspense
      acknowledgeRemotionLicense
    />
  );
}
