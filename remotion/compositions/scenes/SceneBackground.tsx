import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type { AdPalette } from "../ad-styles";
import type { ReactNode } from "react";

export function SceneBackground({
  palette,
  children,
}: {
  palette: AdPalette;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 300], [0, 40], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: palette.background }}>
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: palette.accent,
          opacity: 0.18,
          filter: "blur(140px)",
          top: -120 + drift,
          right: -140,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: palette.accent,
          opacity: 0.12,
          filter: "blur(120px)",
          bottom: -100 - drift,
          left: -120,
        }}
      />
      {children}
    </AbsoluteFill>
  );
}
