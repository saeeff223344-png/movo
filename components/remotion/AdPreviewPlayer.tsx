"use client";

import { Player } from "@remotion/player";
import { AdComposition } from "@/remotion/compositions/AdComposition";
import type { AdCompositionProps } from "@/remotion/compositions/ad-types";
import { AD_DURATION_FRAMES, AD_FPS, AD_HEIGHT_9_16, AD_WIDTH_9_16 } from "@/remotion/constants";

export function AdPreviewPlayer({
  adProps,
  className = "",
}: {
  adProps: AdCompositionProps;
  className?: string;
}) {
  return (
    <Player
      component={AdComposition}
      inputProps={adProps}
      durationInFrames={AD_DURATION_FRAMES}
      fps={AD_FPS}
      compositionWidth={AD_WIDTH_9_16}
      compositionHeight={AD_HEIGHT_9_16}
      style={{ width: "100%", height: "100%" }}
      className={className}
      autoPlay
      loop
      controls
      clickToPlay={false}
      showVolumeControls={false}
    />
  );
}
