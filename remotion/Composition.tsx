import React from "react";
import {
  AbsoluteFill,
  Composition,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  COMP_NAME,
  VIDEO_DURATION_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "./constants";

export const ArabicMotion: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: {
      damping: 12,
      stiffness: 100,
    },
  });

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(entrance, [0, 1], [0.7, 1]);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #111827, #312e81)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
        direction: "rtl",
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          textAlign: "center",
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 90,
            fontWeight: 800,
            marginBottom: 30,
          }}
        >
          حوّل فكرتك إلى فيديو
        </div>

        <div
          style={{
            fontSize: 46,
            opacity: 0.85,
          }}
        >
          موشن جرافيك احترافي خلال دقائق
        </div>

        <div
          style={{
            marginTop: 60,
            display: "inline-block",
            padding: "22px 55px",
            borderRadius: 50,
            backgroundColor: "white",
            color: "#312e81",
            fontSize: 38,
            fontWeight: 700,
          }}
        >
          ابدأ الآن
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const MyComposition: React.FC = () => {
  return (
    <Composition
      id={COMP_NAME}
      component={ArabicMotion}
      durationInFrames={VIDEO_DURATION_FRAMES}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
  );
};