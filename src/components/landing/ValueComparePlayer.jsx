"use client";

import RemotionLandingPlayer from "./RemotionLandingPlayer";
import {
  ValueCompareVisual,
  VALUE_COMPARE_DURATION,
  VALUE_COMPARE_FPS,
  VALUE_COMPARE_SIZE,
} from "../../remotion/ValueCompareVisual";

export default function ValueComparePlayer() {
  return (
    <div
      className="w-full"
      style={{
        aspectRatio: `${VALUE_COMPARE_SIZE.width} / ${VALUE_COMPARE_SIZE.height}`,
        minHeight: 380,
      }}
    >
      <RemotionLandingPlayer
        component={ValueCompareVisual}
        durationInFrames={VALUE_COMPARE_DURATION}
        fps={VALUE_COMPARE_FPS}
        width={VALUE_COMPARE_SIZE.width}
        height={VALUE_COMPARE_SIZE.height}
      />
    </div>
  );
}

