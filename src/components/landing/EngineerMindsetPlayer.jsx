"use client";

import RemotionLandingPlayer from "./RemotionLandingPlayer";
import {
  EngineerMindsetVisual,
  ENGINEER_MINDSET_DURATION,
  ENGINEER_MINDSET_FPS,
  ENGINEER_MINDSET_SIZE,
} from "../../remotion/EngineerMindsetVisual";

export default function EngineerMindsetPlayer() {
  return (
    <div
      className="w-full"
      style={{
        aspectRatio: `${ENGINEER_MINDSET_SIZE.width} / ${ENGINEER_MINDSET_SIZE.height}`,
        minHeight: 260,
      }}
    >
      <RemotionLandingPlayer
        component={EngineerMindsetVisual}
        durationInFrames={ENGINEER_MINDSET_DURATION}
        fps={ENGINEER_MINDSET_FPS}
        width={ENGINEER_MINDSET_SIZE.width}
        height={ENGINEER_MINDSET_SIZE.height}
      />
    </div>
  );
}
