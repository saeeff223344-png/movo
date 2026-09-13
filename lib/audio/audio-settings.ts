import type { AdStyle } from "@/remotion/compositions/ad-types";
import type { VideoPlan } from "@/lib/ai/video-plan-schema";
import type { SceneTransition } from "@/lib/types/video";
import type { VoiceGender, VoiceStyle, NarrationPace, MusicStyle } from "./types";
import { selectMusicStyle } from "./music-selector";

export type ResolvedAudioSettings = {
  voiceGender: VoiceGender;
  voiceStyle: VoiceStyle;
  narrationPace: NarrationPace;
  musicEnabled: boolean;
  musicStyle: MusicStyle;
};

/** visualStyle -> sensible default voice delivery when the AI didn't specify (or a plan predates) `audio`. */
const STYLE_VOICE_DEFAULTS: Record<AdStyle, { voiceStyle: VoiceStyle; narrationPace: NarrationPace }> = {
  fast: { voiceStyle: "energetic", narrationPace: "fast" },
  energetic: { voiceStyle: "energetic", narrationPace: "fast" },
  luxury: { voiceStyle: "luxury", narrationPace: "slow" },
  fun: { voiceStyle: "playful", narrationPace: "normal" },
  tech: { voiceStyle: "authoritative", narrationPace: "normal" },
  minimal: { voiceStyle: "calm", narrationPace: "normal" },
};

type AudioSettingsInput = Pick<VideoPlan, "visualStyle" | "audio" | "business" | "videoTitle" | "durationSeconds"> & {
  /** Only the transition is ever read (by music-selector.ts's pacing heuristic) — kept this narrow so a caller doesn't need a full PlannedScene[] just to resolve audio settings. */
  scenes: readonly { transition: SceneTransition }[];
};

/**
 * Single source of truth for "what should this plan's audio sound like."
 * Prefers the AI planner's own plan.audio decision field-by-field, but
 * every field independently falls back to a visualStyle-derived default —
 * so a VideoPlan built before this field existed (plan.audio === null), or
 * one where a caller only partially constructed the object, still gets
 * sensible, deterministic audio behavior instead of throwing or silently
 * doing nothing. This is what "backward compatible with existing
 * VideoPlans" means in practice: nothing downstream should ever read
 * plan.audio directly — only this function's result.
 */
export function resolveAudioSettings(plan: AudioSettingsInput): ResolvedAudioSettings {
  const defaults = STYLE_VOICE_DEFAULTS[plan.visualStyle];
  const audio = plan.audio;

  return {
    voiceGender: audio?.voiceGender ?? "female",
    voiceStyle: audio?.voiceStyle ?? defaults.voiceStyle,
    narrationPace: audio?.narrationPace ?? defaults.narrationPace,
    musicEnabled: audio?.musicEnabled ?? true,
    musicStyle: audio?.musicStyle ?? selectMusicStyle(plan),
  };
}
