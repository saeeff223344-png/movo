import type { Scene } from "@/lib/types/video";
import type { AdStyle } from "./ad-types";
import type { AdPalette } from "./ad-styles";

export type PlanCompositionMusicProps = {
  src: string;
  baseVolume: number;
  duckedVolume: number;
  /** How many frames the ramp down/up itself takes — see lib/audio/music-ducking.ts. */
  rampFrames: number;
};

export type PlanCompositionVoiceTrack = {
  src: string;
  /** Absolute composition frame this narration clip starts at. */
  startFrame: number;
  /** Capped so a voice clip can never play past the composition's own end (see lib/audio/plan-audio.ts). */
  durationFrames: number;
  /**
   * Continuous narration (Visual Quality Upgrade phase) only: when `src` is
   * a longer file SHARED across scenes rather than this scene's own clip,
   * these select which slice of it plays — passed straight to Remotion's
   * <Audio startFrom/endAt>. Both absent for every per-scene clip
   * (including every plan persisted before this existed), which plays the
   * whole (small, scene-only) file from its own start exactly as before.
   */
  trimStartFrames?: number;
  trimEndFrames?: number;
};

/**
 * Phase 5 (Audio & Voice Sync Engine): everything PlanComposition needs to
 * render audio, built by lib/audio/plan-audio.ts. Every narration interval
 * here is in absolute composition frames — used only to drive the music
 * ducking envelope, not to render narration itself (that's voiceTracks).
 */
export type PlanCompositionAudioProps = {
  /** null renders no <Audio> at all — see music-catalog.ts's docstring on why a real licensed asset is required, never a placeholder. */
  music: PlanCompositionMusicProps | null;
  narrationIntervals: readonly { startFrame: number; endFrame: number }[];
  voiceTracks: readonly PlanCompositionVoiceTrack[];
};

/**
 * Props for PlanComposition — the Phase 2 renderer for a real (Zod-validated)
 * AI VideoPlan (lib/ai/video-plan-schema.ts), built by lib/ai/plan-to-scenes.ts.
 * Unlike AdCompositionProps (ad-types.ts), which drives the fixed 4-beat
 * Hook/Offer/Price/Cta demo, this takes a variable-length scene list — one
 * Sequence per PlannedScene, in order, each sized in frames.
 */
export type PlanCompositionProps = {
  scenes: Scene[];
  visualStyle: AdStyle;
  /**
   * The fully-resolved color palette for this plan (Visual Quality Upgrade
   * phase) — see remotion/compositions/palette-resolution.ts's
   * resolvePlanPalette, which prefers brandColors, then the AI's own
   * per-plan `palette` choice, over AD_PALETTES[visualStyle]'s fixed
   * default. Optional so any caller/test that still only supplies
   * `visualStyle` (e.g. DEFAULT_PLAN_RENDER_PROPS, older fixtures) renders
   * exactly like before PlanComposition falls back to
   * AD_PALETTES[visualStyle] itself when this is omitted.
   */
  palette?: AdPalette;
  /** Pre-resolved by lib/ai/plan-to-scenes.ts from the plan's language (via lib/i18n/config.ts's LOCALE_DIR) so direction is decided — and testable — in one place. */
  dir: "rtl" | "ltr";
  /** Optional (Phase 5) — omitted entirely renders exactly like before (no <Audio> elements at all), so every existing caller/test of PlanComposition is unaffected. */
  audio?: PlanCompositionAudioProps;
};
