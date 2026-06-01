"use client";

import { useEffect, useRef, useState } from "react";

const RETRY_MS = [0, 50, 120, 250, 500, 1000, 2000, 3500];

/**
 * Reliable autoplay for @remotion/player after hydration or lazy chunk load.
 * Returns a ref callback to pass to <Player ref={...} />.
 */
export function useRemotionAutoplay({ onPlaying } = {}) {
  const [player, setPlayer] = useState(null);
  const onPlayingRef = useRef(onPlaying);
  onPlayingRef.current = onPlaying;
  const reportedRef = useRef(false);

  useEffect(() => {
    if (!player) return;

    reportedRef.current = false;

    const notifyPlaying = () => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      onPlayingRef.current?.();
    };

    const play = () => {
      try {
        if (!player.isPlaying?.()) {
          player.play();
        }
      } catch {
        /* composition may not be ready yet */
      }
    };

    const onFrame = () => {
      notifyPlaying();
    };

    play();
    player.addEventListener("waiting", play);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", notifyPlaying);
    player.addEventListener("resume", notifyPlaying);

    const timers = RETRY_MS.map((ms) => setTimeout(play, ms));

    const poll = setInterval(() => {
      if (player.isPlaying?.()) {
        notifyPlaying();
        return;
      }
      play();
    }, 200);

    const stopPoll = setTimeout(() => clearInterval(poll), 6000);

    const onVis = () => {
      if (document.visibilityState === "visible") play();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      player.removeEventListener("waiting", play);
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", notifyPlaying);
      player.removeEventListener("resume", notifyPlaying);
      timers.forEach(clearTimeout);
      clearInterval(poll);
      clearTimeout(stopPoll);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [player]);

  return setPlayer;
}

export function scheduleIdleWork(fn, timeoutMs = 1400) {
  if (typeof requestIdleCallback !== "undefined") {
    return requestIdleCallback(fn, { timeout: timeoutMs });
  }
  return setTimeout(fn, Math.min(timeoutMs, 500));
}

export function cancelIdleWork(id) {
  if (typeof cancelIdleCallback !== "undefined") {
    cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}
