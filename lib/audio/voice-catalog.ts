import type { VoiceGender, VoiceStyle } from "./types";

export type VoiceProfile = {
  id: string;
  gender: VoiceGender;
  style: VoiceStyle;
  /**
   * Provider-specific voice ids this abstract profile maps to. This catalog
   * is OpenAI-specific by design: OpenAI's built-in voices are generic
   * enough to select by (gender, style) alone. ElevenLabs voices are the
   * opposite — each configured voice is already a specific, named persona
   * (e.g. "Haytham") that embodies its own gender/style/language, so it is
   * NOT looked up through this table; see
   * providers/elevenlabs-voice-config.ts's separate, per-language
   * resolveElevenLabsVoiceId instead.
   */
  providerVoiceIds: { openai: string };
};

/**
 * One (gender, style) profile for every combination lib/audio/types.ts's
 * VOICE_GENDERS x VOICE_STYLES defines. The `providerVoiceIds.openai` values
 * are taken from OpenAI's currently-supported built-in TTS voice list
 * (alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar —
 * see node_modules/openai/resources/audio/speech.d.ts's SpeechCreateParams;
 * older names like "onyx"/"nova" are no longer part of that list) — swap
 * them freely without touching anything that calls resolveVoiceProfile.
 */
export const VOICE_CATALOG: readonly VoiceProfile[] = [
  { id: "warm-male", gender: "male", style: "warm", providerVoiceIds: { openai: "cedar" } },
  { id: "warm-female", gender: "female", style: "warm", providerVoiceIds: { openai: "coral" } },
  { id: "energetic-male", gender: "male", style: "energetic", providerVoiceIds: { openai: "echo" } },
  { id: "energetic-female", gender: "female", style: "energetic", providerVoiceIds: { openai: "shimmer" } },
  { id: "calm-male", gender: "male", style: "calm", providerVoiceIds: { openai: "sage" } },
  { id: "calm-female", gender: "female", style: "calm", providerVoiceIds: { openai: "ballad" } },
  { id: "authoritative-male", gender: "male", style: "authoritative", providerVoiceIds: { openai: "ash" } },
  { id: "authoritative-female", gender: "female", style: "authoritative", providerVoiceIds: { openai: "alloy" } },
  { id: "playful-male", gender: "male", style: "playful", providerVoiceIds: { openai: "verse" } },
  { id: "playful-female", gender: "female", style: "playful", providerVoiceIds: { openai: "shimmer" } },
  { id: "luxury-male", gender: "male", style: "luxury", providerVoiceIds: { openai: "marin" } },
  { id: "luxury-female", gender: "female", style: "luxury", providerVoiceIds: { openai: "alloy" } },
];

/**
 * Exact (gender, style) match when the catalog has one (today, always —
 * every combination is populated above); otherwise the closest voice of
 * the same gender, then the first catalog entry at all. Never throws, so a
 * bad or future/unknown style value degrades gracefully instead of
 * failing narration generation outright.
 */
export function resolveVoiceProfile(gender: VoiceGender, style: VoiceStyle): VoiceProfile {
  const exact = VOICE_CATALOG.find((v) => v.gender === gender && v.style === style);
  if (exact) return exact;
  const sameGender = VOICE_CATALOG.find((v) => v.gender === gender);
  return sameGender ?? VOICE_CATALOG[0];
}
