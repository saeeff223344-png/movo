/**
 * Phase 5 (Audio & Voice Sync Engine): the audio domain's own vocabulary —
 * kept separate from lib/types/video.ts because none of this is a "video"
 * concept, it's audio-specific (voice/music taste, TTS provider contracts).
 * lib/ai/video-plan-schema.ts imports these tuples for its `audio` field's
 * zod enums, exactly like it already imports SceneType/SceneTransition from
 * lib/types/video.ts — this file is the single source of truth for what
 * counts as a valid voice gender/style, narration pace, or music style.
 */

export const VOICE_GENDERS = ["male", "female"] as const;
export type VoiceGender = (typeof VOICE_GENDERS)[number];

/** Tone/delivery of the synthesized voice — independent of gender. */
export const VOICE_STYLES = ["warm", "energetic", "calm", "authoritative", "playful", "luxury"] as const;
export type VoiceStyle = (typeof VOICE_STYLES)[number];

export const NARRATION_PACES = ["slow", "normal", "fast"] as const;
export type NarrationPace = (typeof NARRATION_PACES)[number];

export const MUSIC_STYLES = [
  "energetic",
  "cinematic",
  "luxury",
  "modern",
  "minimal",
  "upbeat",
  "technology",
  "emotional",
  "calm",
] as const;
export type MusicStyle = (typeof MUSIC_STYLES)[number];

/** Matches VideoPlan["language"] exactly (never "auto" — a plan always resolves to one concrete language before scenes/narration exist). */
export type NarrationLanguage = "ar" | "en";

/**
 * Which spoken dialect a scene's *narration* should be written in — never
 * onScreenText, which the AI planner always keeps in clear, neutral Arabic
 * understandable across every Arab country regardless of this value (see
 * lib/ai/prompt-builder.ts). "neutral" means no specific dialect (today's
 * default for every voice/provider that hasn't opted into one — English is
 * always "neutral", and so is Arabic whenever no dialect-configured
 * ElevenLabs voice is actually active).
 *
 * The non-"neutral" members are pre-declared so a future ElevenLabs voice
 * slot (see ./providers/elevenlabs-voice-config.ts's ELEVENLABS_VOICE_SLOTS)
 * can select one without adding a new type or touching the planner prompt —
 * dialect is a per-voice config value, never a blanket "language is Arabic"
 * rule (see resolveNarrationDialectPolicy in that same file).
 */
export const NARRATION_DIALECTS = ["neutral", "egyptian", "saudi", "gulf", "levantine", "iraqi"] as const;
export type NarrationDialect = (typeof NARRATION_DIALECTS)[number];

/** One request to synthesize a single line of narration (usually one scene's worth). */
export type TtsRequest = {
  text: string;
  language: NarrationLanguage;
  gender: VoiceGender;
  style: VoiceStyle;
  pace: NarrationPace;
};

export type TtsCostEstimate = {
  characters: number;
  /** Rough USD estimate for this one line, or null when the provider has no known per-character rate (the silent fallback never bills anything). Bookkeeping only — nothing charges a user's quota from this yet. */
  estimatedUsd: number | null;
};

/**
 * Every TtsProvider implementation normalizes to exactly this shape.
 * `audioUrl` is the honesty boundary of the whole architecture: it is
 * either a real, playable URL to real synthesized speech, or `null` — never
 * a placeholder tone or silent clip dressed up as if it were generated
 * speech (see providers/silent-fallback-provider.ts).
 */
export type TtsResult = {
  audioUrl: string | null;
  /** Always populated, even by the fallback — the deterministic estimate lib/audio/scene-audio-sync.ts schedules scenes around (see narration-timing.ts's docstring for why). */
  durationSeconds: number;
  /** "elevenlabs" is MOVO's preferred production provider; "openai" is kept as a fallback/alternative; "silent-fallback" is the always-available dev default. See ../tts-provider-factory.ts for selection order. */
  provider: "elevenlabs" | "openai" | "silent-fallback";
  cost: TtsCostEstimate;
};

/**
 * Provider abstraction: MOVO's audio sync/UI code should only ever depend
 * on this interface (obtained via tts-provider-factory.ts's
 * getTtsProviderChain/synthesizeNarration), never on a concrete provider
 * class — so adding a third real provider later never touches calling code.
 */
export interface TtsProvider {
  readonly id: TtsResult["provider"];
  synthesize(request: TtsRequest): Promise<TtsResult>;
}
