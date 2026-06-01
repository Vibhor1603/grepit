"use client";

import { useEffect, useState } from "react";
import HeroTopologyStatic from "./HeroTopologyStatic";

/**
 * Static SVG for instant paint; Remotion replaces it once loaded and playing.
 * Player is never mounted at opacity 0 (that freezes Remotion's timeline).
 */
export default function HeroTopologyMount() {
  const [Player, setPlayer] = useState(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("./HeroTopologyPlayer").then((mod) => {
      if (!cancelled) setPlayer(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[clamp(380px,42vh,540px)]">
      {!live ? (
        <div className="absolute inset-0">
          <HeroTopologyStatic />
        </div>
      ) : null}
      {Player ? (
        <div className="absolute inset-0">
          <Player onReady={() => setLive(true)} />
        </div>
      ) : null}
    </div>
  );
}
