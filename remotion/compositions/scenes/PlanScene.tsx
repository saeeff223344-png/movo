import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PlanSceneBackground } from "./PlanSceneBackground";
import { renderSceneLayout, LAYOUTS_WITH_OWN_IMAGE } from "./plan-scene-layouts";
import { getTransitionTiming, computeTransitionLayerMotion, type TransitionLayerMotion } from "./transition-motion";
import { getMotionProfile, type MotionIntensity } from "./motion-profiles";
import type { AdPalette } from "../ad-styles";
import type { AdStyle } from "../ad-types";
import type { Scene } from "@/lib/types/video";

/** Typography/spacing in plan-scene-layouts.tsx is tuned at this composition size; PlanScene scales it to whatever size/aspect ratio the plan actually uses. */
const BASE_UNIT = 1080;

type SceneMotion = TransitionLayerMotion & {
  opacity: number;
  /** 0 unless transition === "flash" — a full-frame white overlay opacity, brightest right at the cut. */
  flashOpacity: number;
  /** 0 unless transition === "light-sweep" — a diagonal light band overlay opacity. */
  sweepOpacity: number;
  /** Horizontal position (in % of frame width) of the light-sweep band, only meaningful when sweepOpacity > 0. */
  sweepOffsetPercent: number;
};

/**
 * Whole-scene enter/exit motion driven by the AI plan's own (resolved —
 * see lib/ai/scene-variety.ts) transition choice, applied as one wrapper
 * around whatever purpose-specific layout renders inside, plus a gentle
 * continuous "idle" breathing scale for the whole scene duration so
 * nothing ever looks frozen mid-beat. getTransitionTiming supplies a safe
 * fallback ("fade" timing) for any transition value this switch doesn't
 * recognize, so an unexpected string can never break rendering. The actual
 * per-layer transform/filter/clipPath math lives in
 * transition-motion.ts's computeTransitionLayerMotion — pulled out so it
 * can be called again at a dampened `strength` for the background image
 * layer (see PlanScene below), giving foreground and background genuine,
 * shared-recipe parallax (Requirement 1) instead of two independently
 * hand-tuned motions.
 *
 * The very last scene has no next scene to transition into, so its exit
 * half is skipped entirely (exit pinned to 1) — otherwise every transition
 * (fade, wipe, zoom, etc.) would animate the CTA away to nothing right
 * before the video ends, undercutting the ending instead of strengthening it.
 */
function useSceneTransitionMotion(
  transition: string | undefined,
  durationInFrames: number,
  isLast: boolean,
  strength = 1,
  intensity: MotionIntensity = "medium",
): SceneMotion {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { enterFrames, exitFrames: rawExitFrames } = getTransitionTiming(transition, intensity);
  const exitFrames = isLast ? 0 : Math.min(rawExitFrames, Math.floor(durationInFrames / 2));

  const enter = interpolate(frame, [0, enterFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = isLast
    ? 1
    : interpolate(frame, [durationInFrames - exitFrames, durationInFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const progress = Math.min(enter, exit);

  // Subtle continuous life for the whole scene (requirement: keep moving, never static) — composed on top of every transition below, shared by every layer regardless of strength (an ambient breathing effect, not part of the cut itself).
  const idleScale = 1 + Math.sin(frame / 50) * 0.012;

  if (transition === "cut") {
    return { opacity: 1, transform: `scale(${idleScale})`, filter: undefined, clipPath: undefined, flashOpacity: 0, sweepOpacity: 0, sweepOffsetPercent: -40 };
  }

  const layerMotion = computeTransitionLayerMotion(transition, enter, exit, progress, idleScale, fps, frame, strength);

  let flashOpacity = 0;
  let sweepOpacity = 0;
  let sweepOffsetPercent = -40;

  if (transition === "flash") {
    // Fast-Paced True Motion Graphics phase regression, caught live: high-intensity
    // scaling can shrink enterFrames down to the hardcoded midpoint (3) or below,
    // producing a non-monotonic [0, 3, enterFrames] range (e.g. [0, 3, 3]) that
    // Remotion's interpolate throws on. The midpoint must always be strictly
    // between 0 and enterFrames — falling back to a plain 2-point fade whenever
    // enterFrames is too small (1-2 frames) to fit a real 3-point curve at all.
    const midpoint = Math.floor(enterFrames / 2);
    flashOpacity =
      midpoint > 0 && midpoint < enterFrames
        ? interpolate(frame, [0, midpoint, enterFrames], [0.9, 0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
        : interpolate(frame, [0, enterFrames], [0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }
  if (transition === "light-sweep") {
    sweepOpacity = 1;
    sweepOffsetPercent = interpolate(frame, [0, enterFrames + 10], [-40, 140], { extrapolateRight: "clamp" });
  }

  return { opacity: progress, ...layerMotion, flashOpacity, sweepOpacity, sweepOffsetPercent };
}

/**
 * Dispatches one Scene (from lib/ai/plan-to-scenes.ts) to its purpose-built,
 * variant-selected layout (plan-scene-layouts.tsx) inside the rich animated
 * background (PlanSceneBackground.tsx), wrapped in the plan's own
 * (de-duplicated) transition motion.
 */
export function PlanScene({
  scene,
  palette,
  dir,
  visualStyle,
  isLast = false,
}: {
  scene: Scene;
  palette: AdPalette;
  dir: "rtl" | "ltr";
  visualStyle: AdStyle;
  isLast?: boolean;
}) {
  const { width, height } = useVideoConfig();
  const scale = Math.min(width, height) / BASE_UNIT;
  const profile = getMotionProfile(visualStyle);
  const motion = useSceneTransitionMotion(scene.transition, scene.durationInFrames, isLast, 1, profile.intensity);
  // Same transition recipe, dampened — the full-bleed background image
  // moves along with the cut/push/zoom, just less than the foreground
  // text/badges, so the two layers read as having real depth (Requirement
  // 1) instead of an image that's completely inert during every cut.
  const backgroundMotion = useSceneTransitionMotion(scene.transition, scene.durationInFrames, isLast, profile.parallaxStrength, profile.intensity);

  const hasOwnImageLayout = LAYOUTS_WITH_OWN_IMAGE.has(scene.type);
  const fullBleedImageUrl = hasOwnImageLayout ? undefined : scene.content.imageUrl || undefined;
  // A LAYOUTS_WITH_OWN_IMAGE purpose renders its AI video itself (inside the layout's own hero visual — see plan-scene-layouts.tsx's SceneVisual usage), never as this full-bleed background, for the same reason it never gets a full-bleed image either (Requirement 11: never show the same resolved media twice in one scene).
  const fullBleedVideoUrl = hasOwnImageLayout ? undefined : scene.content.videoUrl || undefined;
  const fullBleedVideoDurationInFrames = fullBleedVideoUrl ? Number(scene.content.videoDurationInFrames) || undefined : undefined;

  return (
    <PlanSceneBackground
      palette={palette}
      scenePurpose={scene.type}
      imageUrl={fullBleedImageUrl}
      videoUrl={fullBleedVideoUrl}
      videoDurationInFrames={fullBleedVideoDurationInFrames}
      sceneId={scene.id}
      durationInFrames={scene.durationInFrames}
      backgroundMotion={backgroundMotion}
      motionProfile={profile}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: motion.opacity,
          transform: motion.transform,
          filter: motion.filter,
          clipPath: motion.clipPath,
        }}
      >
        {renderSceneLayout({ scene, palette, dir, scale, visualStyle })}
      </div>

      {motion.flashOpacity > 0 && (
        <div style={{ position: "absolute", inset: 0, background: "#ffffff", opacity: motion.flashOpacity, zIndex: 10, pointerEvents: "none" }} />
      )}

      {motion.sweepOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${motion.sweepOffsetPercent}%`,
            width: "22%",
            background: "linear-gradient(75deg, transparent, rgba(255,255,255,0.35), transparent)",
            opacity: motion.sweepOpacity,
            zIndex: 10,
            pointerEvents: "none",
          }}
        />
      )}
    </PlanSceneBackground>
  );
}
