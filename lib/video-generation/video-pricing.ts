/**
 * Centralized third-party video-generation pricing bookkeeping —
 * informational only, exactly like lib/audio/tts-pricing.ts and
 * lib/visuals/visual-pricing.ts (never enforces a quota;
 * lib/video-director/video-director-config.ts's getMaxAiVideoScenes is
 * the actual spend control). Runway bills in its own "credits" unit
 * rather than USD directly — the real POST /v1/image_to_video response
 * already returns `estimatedCost.credits`, and the terminal task GET
 * returns the actual `cost.credits` charged, so this file's job is only
 * to convert that into an approximate USD figure for MOVO's own cost
 * reporting, not to predict it ourselves.
 */

export type VideoPricingRate = {
  /** Approximate USD per Runway credit at MOVO's currently configured plan. */
  usdPerCredit: number;
  source: string;
};

/**
 * Runway's standard pay-as-you-go credit pricing. The real, authoritative
 * cost for any given generation is always the provider's own returned
 * `credits` figure (see lib/video-generation/types.ts's
 * GenerateVideoResult.providerCost) — this rate only turns that into an
 * approximate USD number for display/logging. Update this (and `source`)
 * together if Runway republishes credit pricing.
 */
export const RUNWAY_CREDIT_RATE: VideoPricingRate = {
  usdPerCredit: 0.01,
  source: "Approximate Runway pay-as-you-go credit rate (runwayml.com/pricing, ~$0.01/credit at standard tiers) — update when Runway republishes pricing.",
};

export function estimateVideoCostUsd(credits: number, rate: VideoPricingRate): number {
  return credits * rate.usdPerCredit;
}
