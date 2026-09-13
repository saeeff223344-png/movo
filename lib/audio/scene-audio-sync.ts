import type { VideoPlan, PlannedScene } from "@/lib/ai/video-plan-schema";
import type { NarrationPace } from "./types";
import { estimateNarrationSeconds } from "./narration-timing";
import { resolveAudioSettings } from "./audio-settings";

/** Small delay after a scene's own entrance before narration starts, so a line never begins exactly on the visual cut. Capped to 15% of the scene's duration for very short scenes. */
const NARRATION_LEAD_IN_SECONDS = 0.15;
/** Minimum silence Remotion must keep between narration end and the scene's own end, so a transition can never visually/audibly cut speech off mid-word. */
const NARRATION_TRAILING_SAFETY_SECONDS = 0.25;

export type SceneAudioTiming = {
  sceneId: string;
  /** Seconds from the start of the whole video. */
  start: number;
  /** Seconds from the start of the whole video — may be later than the AI's own planned end when narration needed more room (see adaptSceneDurationsForNarration). */
  end: number;
  duration: number;
  hasNarration: boolean;
  /** Seconds from the scene's own start to when narration should begin. */
  narrationStart: number;
  narrationDuration: number;
  /** Seconds from the scene's own start to when narration ends (narrationStart + narrationDuration). */
  narrationEnd: number;
  /** Seconds of scene time left after narration ends and before the scene ends — visual "breathing room." Always >= 0, and >= NARRATION_TRAILING_SAFETY_SECONDS whenever hasNarration. */
  pauseSeconds: number;
};

function computeOneSceneTiming(scene: PlannedScene, start: number, language: "ar" | "en", pace: NarrationPace): SceneAudioTiming {
  const hasNarration = Boolean(scene.narration && scene.narration.trim().length > 0);
  const narrationStart = hasNarration ? Math.min(NARRATION_LEAD_IN_SECONDS, scene.duration * 0.15) : 0;
  const narrationDuration = hasNarration ? estimateNarrationSeconds(scene.narration ?? "", language, pace) : 0;
  const requiredDuration = hasNarration ? narrationStart + narrationDuration + NARRATION_TRAILING_SAFETY_SECONDS : scene.duration;
  const duration = Math.max(scene.duration, requiredDuration);
  const narrationEnd = narrationStart + narrationDuration;

  return {
    sceneId: scene.id,
    start,
    end: start + duration,
    duration,
    hasNarration,
    narrationStart,
    narrationDuration,
    narrationEnd,
    pauseSeconds: Math.max(0, duration - narrationEnd),
  };
}

/**
 * Computes every scene's real audio-aware timing in one deterministic pass.
 * Scene start times are recomputed cumulatively from each scene's own
 * (possibly narration-extended) duration — exactly how
 * remotion/compositions/PlanComposition.tsx already builds frame offsets
 * from durationInFrames rather than trusting the AI's own startTime — so
 * this can never introduce a gap or overlap even if the plan's own
 * startTime values were already slightly off. Because each scene's window
 * is `[start, end)` and every narration interval is fully inside its own
 * scene's window by construction, no two scenes' narration can ever
 * overlap, and the very last scene is adapted exactly like every other one
 * (its narration is never assumed to run past the video's own end).
 */
export function computeSceneAudioTimings(plan: VideoPlan): SceneAudioTiming[] {
  const { narrationPace } = resolveAudioSettings(plan);
  let cursor = 0;
  return plan.scenes.map((scene) => {
    const timing = computeOneSceneTiming(scene, cursor, plan.language, narrationPace);
    cursor = timing.end;
    return timing;
  });
}

/**
 * Returns a new VideoPlan whose scene durations/startTimes are widened to
 * fit their own narration whenever the AI under-budgeted a scene's spoken
 * line — the AI-first equivalent of "don't let a transition cut off the
 * voice" (the calling code never has to think about audio at all). A
 * complete no-op (every scene's duration unchanged) whenever every scene's
 * planned duration already comfortably fits its narration, which is the
 * common case — safe to run unconditionally wherever a VideoPlan is turned
 * into Remotion-facing data (see lib/ai/plan-to-scenes.ts).
 */
export function adaptSceneDurationsForNarration(plan: VideoPlan): VideoPlan {
  const timings = computeSceneAudioTimings(plan);
  const lastTiming = timings[timings.length - 1];

  return {
    ...plan,
    durationSeconds: lastTiming ? lastTiming.end : plan.durationSeconds,
    scenes: plan.scenes.map((scene, i) => ({
      ...scene,
      startTime: timings[i].start,
      duration: timings[i].duration,
    })),
  };
}
