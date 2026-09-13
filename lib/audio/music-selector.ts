import { hashString } from "@/lib/ai/scene-variety";
import type { AdStyle } from "@/remotion/compositions/ad-types";
import type { SceneTransition } from "@/lib/types/video";
import type { MusicStyle } from "./types";
import { getMusicTrack, type MusicTrack } from "./music-catalog";

/** Transitions that read as fast/urgent — used only to bias music energy, mirroring lib/ai/scene-variety.ts's own FAST_TRANSITIONS grouping. */
const FAST_TRANSITIONS = new Set<SceneTransition>(["fast-cut", "whip-left", "whip-right", "flash", "scale-pop", "zoom-in", "zoom-out"]);

/** Each visualStyle narrows to a short list of stylistically compatible music styles, ordered by how strongly they fit. */
const STYLE_MUSIC_CANDIDATES: Record<AdStyle, readonly MusicStyle[]> = {
  fast: ["energetic", "upbeat"],
  energetic: ["energetic", "upbeat"],
  luxury: ["luxury", "cinematic", "emotional"],
  fun: ["upbeat", "energetic"],
  tech: ["technology", "modern"],
  minimal: ["minimal", "calm"],
};

type MusicSelectionInput = {
  visualStyle: AdStyle;
  durationSeconds: number;
  business: string;
  videoTitle: string;
  scenes: readonly { transition: SceneTransition }[];
};

/**
 * Deterministically (never Math.random()) picks which music style best fits
 * a plan: visualStyle narrows to a short candidate list; a short ad (<=10s)
 * or one whose scenes are mostly fast transitions reads as urgent and
 * nudges toward the highest-energy candidate; otherwise a stable hash of
 * the plan's own business/title breaks ties between equally valid
 * candidates — so two different businesses using the same visualStyle
 * don't always get identical-feeling music, but the same plan always
 * resolves to the same track.
 */
export function selectMusicStyle(plan: MusicSelectionInput): MusicStyle {
  const candidates = STYLE_MUSIC_CANDIDATES[plan.visualStyle];
  const fastTransitionCount = plan.scenes.filter((s) => FAST_TRANSITIONS.has(s.transition)).length;
  const isUrgent = plan.durationSeconds <= 10 || fastTransitionCount >= Math.ceil(plan.scenes.length / 2);

  if (isUrgent) {
    return candidates.reduce((best, candidate) => (getMusicTrack(candidate).energy > getMusicTrack(best).energy ? candidate : best), candidates[0]);
  }

  const tieBreakIndex = hashString(`${plan.business}:${plan.videoTitle}`) % candidates.length;
  return candidates[tieBreakIndex];
}

export function selectMusicTrack(plan: MusicSelectionInput): MusicTrack {
  return getMusicTrack(selectMusicStyle(plan));
}
