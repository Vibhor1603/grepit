"use client";

import RemotionLandingPlayer from "./RemotionLandingPlayer";
import {
  HeroTopologyVisual,
  HERO_TOPOLOGY_DURATION,
  HERO_TOPOLOGY_FPS,
  HERO_TOPOLOGY_SIZE,
} from "../../remotion/HeroTopologyVisual";

export default function HeroTopologyPlayer({ onReady }) {
  return (
    <RemotionLandingPlayer
      component={HeroTopologyVisual}
      durationInFrames={HERO_TOPOLOGY_DURATION}
      fps={HERO_TOPOLOGY_FPS}
      width={HERO_TOPOLOGY_SIZE.width}
      height={HERO_TOPOLOGY_SIZE.height}
      onReady={onReady}
    />
  );
}
