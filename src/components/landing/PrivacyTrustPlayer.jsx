"use client";

import RemotionLandingPlayer from "./RemotionLandingPlayer";
import {
  PrivacyTrustVisual,
  PRIVACY_TRUST_DURATION,
  PRIVACY_TRUST_FPS,
  PRIVACY_TRUST_SIZE,
} from "../../remotion/PrivacyTrustVisual";

export default function PrivacyTrustPlayer() {
  return (
    <div
      className="w-full"
      style={{
        aspectRatio: `${PRIVACY_TRUST_SIZE.width} / ${PRIVACY_TRUST_SIZE.height}`,
        minHeight: 260,
      }}
    >
      <RemotionLandingPlayer
        component={PrivacyTrustVisual}
        durationInFrames={PRIVACY_TRUST_DURATION}
        fps={PRIVACY_TRUST_FPS}
        width={PRIVACY_TRUST_SIZE.width}
        height={PRIVACY_TRUST_SIZE.height}
      />
    </div>
  );
}

