/**
 * Automatic Visual Assets phase, Requirement 12 (cost control): centralizes
 * every tunable limit in one file, mirroring lib/audio/tts-pricing.ts's
 * "never scatter a magic number across providers" convention.
 */

const DEFAULT_MAX_AUTO_VISUALS_PER_VIDEO = 3;

/**
 * Hard ceiling on how many *new* provider image-generation calls one
 * video's automatic visual planning may make, regardless of how many
 * scenes want a "hero"/"supporting" visual — the whole point of
 * Requirement 12 ("do not generate one expensive image for every second").
 * Configurable via MOVO_MAX_AUTO_VISUALS so this can be tuned per
 * environment/deploy without a code change; falls back to the default for
 * an unset, blank, non-numeric, or non-positive value.
 */
export function getMaxAutoVisualsPerVideo(): number {
  const raw = process.env.MOVO_MAX_AUTO_VISUALS?.trim();
  if (!raw) return DEFAULT_MAX_AUTO_VISUALS_PER_VIDEO;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_AUTO_VISUALS_PER_VIDEO;
}

/** Square-ish sizes gpt-image-1 actually supports; picked by nearest aspect ratio rather than passing the composition's raw pixel dimensions through (see visual-prompt-builder.ts's pickImageSize). */
export const OPENAI_IMAGE_SIZES = {
  portrait: "1024x1536",
  landscape: "1536x1024",
  square: "1024x1024",
} as const;

export type OpenAiImageSize = (typeof OPENAI_IMAGE_SIZES)[keyof typeof OPENAI_IMAGE_SIZES];
