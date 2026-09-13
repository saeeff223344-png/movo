/**
 * Dynamic AI Video Director phase, Requirement 6 (cost control):
 * centralizes every tunable limit here, mirroring
 * lib/visuals/visual-config.ts's getMaxAutoVisualsPerVideo convention —
 * one file to audit/tune instead of a magic number buried in an action.
 */

const DEFAULT_MAX_AI_VIDEO_SCENES = 2;
const DEFAULT_AI_VIDEO_DURATION_SECONDS = 5;

/** MOVO_MAX_AI_VIDEO_SCENES — hard ceiling on how many scenes in one video may ever reach the (paid) video-generation provider, regardless of how many the AI director recommends. Falls back to the default for an unset, blank, non-numeric, or non-positive value. */
export function getMaxAiVideoScenes(): number {
  const raw = process.env.MOVO_MAX_AI_VIDEO_SCENES?.trim();
  if (!raw) return DEFAULT_MAX_AI_VIDEO_SCENES;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_AI_VIDEO_SCENES;
}

/** MOVO_AI_VIDEO_DURATION_SECONDS — every AI-generated scene video's fixed duration (Requirement 6: "5 seconds each initially"). A single fixed value, not per-scene, keeps cost predictable and matches Gen-4 Turbo's fastest/cheapest tier. */
export function getAiVideoDurationSeconds(): number {
  const raw = process.env.MOVO_AI_VIDEO_DURATION_SECONDS?.trim();
  if (!raw) return DEFAULT_AI_VIDEO_DURATION_SECONDS;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 2 && parsed <= 10 ? parsed : DEFAULT_AI_VIDEO_DURATION_SECONDS;
}
