import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SceneBackground } from "./SceneBackground";
import type { AdPalette } from "../ad-styles";

export function HookScene({
  title,
  brandName,
  palette,
}: {
  title: string;
  brandName: string;
  palette: AdPalette;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { stiffness: palette.springStiffness, damping: palette.springDamping },
  });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const translateY = interpolate(entrance, [0, 1], [40, 0]);

  return (
    <SceneBackground palette={palette}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 80,
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: palette.accent,
            letterSpacing: 1,
            opacity,
          }}
        >
          {brandName}
        </span>
        <div
          style={{
            marginTop: 24,
            fontSize: 108,
            fontWeight: 800,
            color: palette.text,
            lineHeight: 1.1,
            opacity,
            transform: `translateY(${translateY}px)`,
          }}
        >
          {title}
        </div>
      </div>
    </SceneBackground>
  );
}
