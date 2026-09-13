/**
 * Centralized third-party image-generation pricing bookkeeping —
 * informational only, exactly like lib/audio/tts-pricing.ts (never enforces
 * a quota; lib/visuals/visual-config.ts's getMaxAutoVisualsPerVideo is the
 * actual spend control). One place to audit/update a rate instead of a
 * constant buried inside a provider file.
 */

export type ImagePricingRate = {
  usdPerImage: number;
  /** Where this number comes from and when it was last checked — never delete this when updating the rate, just replace it. */
  source: string;
};

/**
 * OpenAI's gpt-image-1, "medium" quality, ~1024x1536/1536x1024/1024x1024
 * (see visual-config.ts's OPENAI_IMAGE_SIZES) — MOVO's only image provider
 * today (lib/visuals/providers/openai-image-provider.ts). This is an
 * approximate, conservative figure from OpenAI's published per-image
 * pricing at "medium" quality; update this (and `source`) together if
 * OpenAI republishes gpt-image-1 pricing or MOVO changes quality tier.
 */
export const OPENAI_GPT_IMAGE_1_MEDIUM_RATE: ImagePricingRate = {
  usdPerImage: 0.07,
  source: "Approximate OpenAI gpt-image-1 'medium' quality per-image rate (platform.openai.com/docs/pricing) — update when OpenAI republishes pricing.",
};

export function estimateImageCostUsd(count: number, rate: ImagePricingRate): number {
  return count * rate.usdPerImage;
}
