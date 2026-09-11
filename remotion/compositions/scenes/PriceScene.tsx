import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SceneBackground } from "./SceneBackground";
import type { AdPalette } from "../ad-styles";

export function PriceScene({
  price,
  palette,
}: {
  price: string;
  palette: AdPalette;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({
    frame,
    fps,
    config: { stiffness: palette.springStiffness + 40, damping: palette.springDamping - 2 },
  });
  const scale = interpolate(pop, [0, 1], [0.5, 1]);
  const rotate = interpolate(pop, [0, 1], [-6, 0]);

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
        }}
      >
        <div
          style={{
            transform: `scale(${scale}) rotate(${rotate}deg)`,
            background: palette.badgeBg,
            color: palette.badgeText,
            borderRadius: 40,
            padding: "40px 64px",
            textAlign: "center",
            boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontSize: 84, fontWeight: 800 }}>{price}</div>
        </div>
      </div>
    </SceneBackground>
  );
}
