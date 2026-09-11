import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SceneBackground } from "./SceneBackground";
import type { AdPalette } from "../ad-styles";

export function OfferScene({
  subtitle,
  offer,
  palette,
}: {
  subtitle: string;
  offer: string;
  palette: AdPalette;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({
    frame,
    fps,
    config: { stiffness: palette.springStiffness, damping: palette.springDamping },
  });
  const scale = interpolate(pop, [0, 1], [0.7, 1]);
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

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
          gap: 48,
        }}
      >
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: "50%",
            border: `3px solid ${palette.accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${scale})`,
            opacity,
          }}
        >
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: palette.badgeBg,
              opacity: 0.9,
            }}
          />
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "0 64px",
            opacity,
            transform: `translateY(${interpolate(pop, [0, 1], [24, 0])}px)`,
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "10px 28px",
              borderRadius: 999,
              background: palette.badgeBg,
              color: palette.badgeText,
              fontSize: 30,
              fontWeight: 800,
              marginBottom: 20,
            }}
          >
            {offer}
          </div>
          <div style={{ fontSize: 52, fontWeight: 700, color: palette.text }}>
            {subtitle}
          </div>
        </div>
      </div>
    </SceneBackground>
  );
}
