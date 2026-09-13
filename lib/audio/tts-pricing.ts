/**
 * Centralized third-party TTS pricing bookkeeping — informational only, for
 * lib/audio/audio-cost.ts's summarizeAudioCost; never enforces a quota (see
 * that file's docstring). Before this file existed, each provider hardcoded
 * its own `USD_PER_1K_CHARACTERS` constant inline — exactly the kind of
 * scattered pricing constant this file exists to prevent. Add a new
 * provider/model's rate here, never inline in its provider class, so a
 * pricing change or audit is always a one-file diff.
 */

export type TtsPricingRate = {
  /** USD per 1,000 input characters, at MOVO's currently configured plan/rate for this model. */
  usdPer1kCharacters: number;
  /** Where this number comes from and when it was last checked, so a stale rate is easy to spot and re-verify later — never delete this when updating the rate, just replace it. */
  source: string;
};

export function estimateTtsCostUsd(characters: number, rate: TtsPricingRate): number {
  return (characters / 1000) * rate.usdPer1kCharacters;
}

/**
 * ElevenLabs' eleven_multilingual_v2 — the only ElevenLabs model MOVO uses
 * today (see ./providers/elevenlabs-tts-provider.ts's ELEVENLABS_MODEL_ID).
 * $0.10 / 1,000 characters is ElevenLabs' current official pay-as-you-go API
 * rate for this model. The previous $0.20/1k figure was a Starter-plan
 * monthly-subscription-allocation estimate ($6/mo / 30,000 credits), not the
 * published per-character API rate, and has been corrected here. Update
 * this (and `source`) together if ElevenLabs republishes its pricing.
 */
export const ELEVENLABS_MULTILINGUAL_V2_RATE: TtsPricingRate = {
  usdPer1kCharacters: 0.1,
  source: "ElevenLabs official pay-as-you-go API rate for eleven_multilingual_v2 (elevenlabs.io/pricing)",
};

/**
 * OpenAI's gpt-4o-mini-tts — MOVO's fallback/alternative TTS provider (see
 * ./providers/openai-tts-provider.ts). Moved here from that file for the
 * same reason as the ElevenLabs rate above: one place to audit every TTS
 * rate MOVO bookkeeps against, instead of one constant per provider file.
 */
export const OPENAI_TTS_RATE: TtsPricingRate = {
  usdPer1kCharacters: 0.015,
  source: "Approximate OpenAI TTS per-character rate — update when OpenAI republishes gpt-4o-mini-tts pricing",
};
