import { interpolate, spring } from "remotion";
import type { SceneTransition } from "@/lib/types/video";
import { TRANSITION_FAMILY } from "@/lib/ai/transition-families";
import type { MotionIntensity } from "./motion-profiles";

export { TRANSITION_FAMILY };

export type TransitionTiming = { enterFrames: number; exitFrames: number };

const DEFAULT_TIMING: TransitionTiming = { enterFrames: 16, exitFrames: 16 };

/**
 * Fast-Paced True Motion Graphics phase, Requirement 7: "transitions
 * should be short and strong" for energetic styles — scales every
 * transition's base timing down for high intensity (roughly halved) and
 * slightly up for low intensity (luxury/real-estate's explicit "remain
 * controlled" exception), instead of every style sharing one fixed
 * duration table. `medium` is exactly 1 — the original, unscaled timings —
 * so any caller that doesn't pass an intensity keeps today's behavior.
 */
const INTENSITY_TIMING_SCALE: Record<MotionIntensity, number> = { low: 1.15, medium: 1, high: 0.55 };

/**
 * How long each transition's enter/exit motion takes, in frames @ 30fps —
 * roughly 0.15–0.5s (4–15 frames) for the fast/energetic ones, matching
 * Reels/TikTok pacing; intentionally longer for luxury-fade/wipe/
 * card-swap/split-reveal/light-sweep, which need more frames to read as
 * the deliberate, weightier beats they are. PlanScene.tsx's
 * useSceneTransitionMotion is what actually turns each entry into a
 * visual (this file only owns the timing, so it's testable without a
 * Remotion render context).
 */
export const TRANSITION_TIMINGS: Record<SceneTransition, TransitionTiming> = {
  cut: { enterFrames: 1, exitFrames: 1 },
  fade: { enterFrames: 16, exitFrames: 16 },
  slide: { enterFrames: 16, exitFrames: 16 },
  "fast-cut": { enterFrames: 8, exitFrames: 8 },
  "luxury-fade": { enterFrames: 26, exitFrames: 24 },
  "zoom-in": { enterFrames: 10, exitFrames: 8 },
  "zoom-out": { enterFrames: 12, exitFrames: 10 },
  "push-left": { enterFrames: 12, exitFrames: 12 },
  "push-right": { enterFrames: 12, exitFrames: 12 },
  "push-up": { enterFrames: 12, exitFrames: 12 },
  "push-down": { enterFrames: 12, exitFrames: 12 },
  "whip-left": { enterFrames: 5, exitFrames: 5 },
  "whip-right": { enterFrames: 5, exitFrames: 5 },
  blur: { enterFrames: 10, exitFrames: 10 },
  flash: { enterFrames: 6, exitFrames: 6 },
  wipe: { enterFrames: 14, exitFrames: 14 },
  "scale-pop": { enterFrames: 10, exitFrames: 8 },
  "card-swap": { enterFrames: 14, exitFrames: 14 },
  "split-reveal": { enterFrames: 14, exitFrames: 14 },
  "light-sweep": { enterFrames: 18, exitFrames: 14 },
  spin: { enterFrames: 14, exitFrames: 12 },
};

/** Safe deterministic fallback for a missing/invalid transition — "fade" timing, never a crash or undefined lookup. Scaled by `intensity` (default "medium" = unscaled, today's exact original values). */
export function getTransitionTiming(transition: string | undefined, intensity: MotionIntensity = "medium"): TransitionTiming {
  const base = transition && transition in TRANSITION_TIMINGS ? TRANSITION_TIMINGS[transition as SceneTransition] : DEFAULT_TIMING;
  const scale = INTENSITY_TIMING_SCALE[intensity];
  return {
    enterFrames: Math.max(1, Math.round(base.enterFrames * scale)),
    exitFrames: Math.max(1, Math.round(base.exitFrames * scale)),
  };
}

/**
 * True Motion Graphics Engine phase, Requirement 1/3: the same physical
 * motion recipe every transition already used for the foreground content,
 * now parametrized by `strength` (1 = full motion, as the foreground
 * layer always gets; <1 = a dampened, slower-moving echo of the same
 * motion for a background image layer) — this is what makes "foreground
 * and background move at different speeds" (Requirement 1) a real,
 * shared-recipe behavior instead of two independently hand-tuned
 * animations that could drift out of sync. `clipPath`-based transitions
 * (wipe/split-reveal) intentionally ignore `strength` — a reveal boundary
 * must land at the same place on every layer or the cut reads as broken,
 * not as depth.
 *
 * Pulled out of PlanScene.tsx's old inline switch so it's callable twice
 * per scene (foreground strength=1, background strength=profile's
 * parallaxStrength) from one single source of truth per transition, and
 * so it's unit-testable without a Remotion render tree.
 */
export type TransitionLayerMotion = { transform: string; filter?: string; clipPath?: string };

export function computeTransitionLayerMotion(
  transition: string | undefined,
  enter: number,
  exit: number,
  progress: number,
  idleScale: number,
  fps: number,
  frame: number,
  strength: number,
): TransitionLayerMotion {
  const dampenScale = (rawScale: number) => 1 + (rawScale - 1) * strength;
  const dampen = (value: number) => value * strength;

  switch (transition) {
    case "cut":
      return { transform: `scale(${idleScale})` };

    case "fast-cut": {
      const s = dampenScale(interpolate(progress, [0, 1], [0.9, 1]));
      return { transform: `scale(${s * idleScale})` };
    }

    case "zoom-in": {
      const enterScale = dampenScale(interpolate(enter, [0, 1], [1.22, 1]));
      const exitScale = dampenScale(interpolate(exit, [0, 1], [0.9, 1]));
      return { transform: `scale(${enterScale * exitScale * idleScale})` };
    }

    case "zoom-out": {
      const enterScale = dampenScale(interpolate(enter, [0, 1], [0.72, 1]));
      const exitScale = dampenScale(interpolate(exit, [0, 1], [1.18, 1]));
      return { transform: `scale(${enterScale * exitScale * idleScale})` };
    }

    case "push-left": {
      const enterX = dampen(interpolate(enter, [0, 1], [100, 0]));
      const exitX = dampen(interpolate(exit, [0, 1], [-100, 0]));
      return { transform: `translateX(${enterX + exitX}%) scale(${idleScale})` };
    }

    case "push-right": {
      const enterX = dampen(interpolate(enter, [0, 1], [-100, 0]));
      const exitX = dampen(interpolate(exit, [0, 1], [100, 0]));
      return { transform: `translateX(${enterX + exitX}%) scale(${idleScale})` };
    }

    case "push-up": {
      const enterY = dampen(interpolate(enter, [0, 1], [100, 0]));
      const exitY = dampen(interpolate(exit, [0, 1], [-100, 0]));
      return { transform: `translateY(${enterY + exitY}%) scale(${idleScale})` };
    }

    case "push-down": {
      const enterY = dampen(interpolate(enter, [0, 1], [-100, 0]));
      const exitY = dampen(interpolate(exit, [0, 1], [100, 0]));
      return { transform: `translateY(${enterY + exitY}%) scale(${idleScale})` };
    }

    case "whip-left": {
      const enterX = dampen(interpolate(enter, [0, 1], [130, 0]));
      const exitX = dampen(interpolate(exit, [0, 1], [-130, 0]));
      const squeeze = dampenScale(interpolate(progress, [0, 0.5, 1], [0.85, 1.08, 1]));
      return { transform: `translateX(${enterX + exitX}%) scaleX(${squeeze}) scale(${idleScale})` };
    }

    case "whip-right": {
      const enterX = dampen(interpolate(enter, [0, 1], [-130, 0]));
      const exitX = dampen(interpolate(exit, [0, 1], [130, 0]));
      const squeeze = dampenScale(interpolate(progress, [0, 0.5, 1], [0.85, 1.08, 1]));
      return { transform: `translateX(${enterX + exitX}%) scaleX(${squeeze}) scale(${idleScale})` };
    }

    case "blur": {
      const blurAmount = dampen(interpolate(progress, [0, 1], [22, 0]));
      return { transform: `scale(${idleScale})`, filter: `blur(${blurAmount}px)` };
    }

    case "flash": {
      const s = dampenScale(interpolate(progress, [0, 1], [0.96, 1]));
      return { transform: `scale(${s * idleScale})` };
    }

    case "wipe": {
      const wipeIn = interpolate(enter, [0, 1], [100, 0]);
      const wipeOut = interpolate(exit, [0, 1], [100, 0]);
      return { transform: `scale(${idleScale})`, clipPath: `inset(0 ${Math.max(wipeIn, wipeOut)}% 0 0)` };
    }

    case "scale-pop": {
      const popSpring = spring({ frame, fps, config: { stiffness: 260, damping: 11 } });
      const s = dampenScale(interpolate(popSpring, [0, 1], [0.4, 1]));
      const exitS = dampenScale(interpolate(exit, [0, 1], [0.85, 1]));
      return { transform: `scale(${s * exitS * idleScale})` };
    }

    case "card-swap": {
      const enterX = dampen(interpolate(enter, [0, 1], [55, 0]));
      const exitX = dampen(interpolate(exit, [0, 1], [-55, 0]));
      const enterRotate = dampen(interpolate(enter, [0, 1], [8, 0]));
      const exitRotate = dampen(interpolate(exit, [0, 1], [-8, 0]));
      return { transform: `translateX(${enterX + exitX}%) rotate(${enterRotate + exitRotate}deg) scale(${idleScale})` };
    }

    case "split-reveal": {
      const enterInset = interpolate(enter, [0, 1], [50, 0]);
      const exitInset = interpolate(exit, [0, 1], [50, 0]);
      const inset = Math.max(enterInset, exitInset);
      return { transform: `scale(${idleScale})`, clipPath: `inset(0 ${inset}% 0 ${inset}%)` };
    }

    case "light-sweep":
      return { transform: `scale(${idleScale})` };

    case "spin": {
      const rot = dampen(interpolate(enter, [0, 1], [-10, 0]));
      const exitRot = dampen(interpolate(exit, [0, 1], [10, 0]));
      const s = dampenScale(interpolate(progress, [0, 1], [0.85, 1]));
      return { transform: `rotate(${rot + exitRot}deg) scale(${s * idleScale})` };
    }

    case "luxury-fade": {
      const s = dampenScale(interpolate(progress, [0, 1], [0.96, 1]));
      return { transform: `scale(${s * idleScale})` };
    }

    case "slide": {
      const spr = spring({ frame, fps, config: { stiffness: 140, damping: 18 } });
      const enterOffset = dampen(interpolate(spr, [0, 1], [60, 0]));
      const exitOffset = dampen(interpolate(exit, [0, 1], [-60, 0]));
      return { transform: `translateY(${enterOffset + exitOffset}px) scale(${idleScale})` };
    }

    case "fade":
    default:
      return { transform: `scale(${idleScale})` };
  }
}
