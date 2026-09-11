import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SceneBackground } from "./SceneBackground";
import type { AdPalette } from "../ad-styles";

export function CtaScene({
  brandName,
  cta,
  palette,
}: {
  brandName: string;
  cta: string;
  palette: AdPalette;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoPop = spring({ frame, fps, config: { stiffness: 160, damping: 14 } });
  const ctaPop = spring({
    frame: frame - 12,
    fps,
    config: { stiffness: 160, damping: 14 },
  });

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
          gap: 40,
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: palette.text,
            transform: `scale(${interpolate(logoPop, [0, 1], [0.6, 1])})`,
            opacity: interpolate(logoPop, [0, 1], [0, 1]),
          }}
        >
          {brandName}
        </div>

        <div
          style={{
            background: palette.badgeBg,
            color: palette.badgeText,
            borderRadius: 999,
            padding: "26px 68px",
            fontSize: 40,
            fontWeight: 800,
            transform: `scale(${interpolate(ctaPop, [0, 1], [0.7, 1], { extrapolateLeft: "clamp" })})`,
            opacity: interpolate(ctaPop, [0, 1], [0, 1], { extrapolateLeft: "clamp" }),
          }}
        >
          {cta}
        </div>
      </div>
    </SceneBackground>
  );
}
