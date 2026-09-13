import type { NarrationDialect, NarrationLanguage } from "../types";

export type ElevenLabsVoiceSlot = {
  language: NarrationLanguage;
  /** Human-readable name for docs/debugging only — NEVER used to derive an id. ElevenLabs voice ids and display names are unrelated strings; guessing one from the other would silently play the wrong voice in production. */
  label: string;
  /** The env var holding this slot's real ElevenLabs voice id. */
  envVar: string;
  /**
   * The spoken dialect the AI planner should write this voice's *narration*
   * in — "neutral" (MSA/no specific dialect) unless this specific voice has
   * a deliberate dialect identity. Each slot owns its own value so adding a
   * differently-dialected voice later (e.g. a Saudi or Gulf Arabic voice)
   * never requires changing another slot's behavior or the resolution logic
   * in resolveNarrationDialectPolicy below.
   */
  narrationDialect: NarrationDialect;
};

/**
 * MOVO's configured ElevenLabs voices. Today this is exactly one slot: the
 * production Arabic advertising voice the team selected in ElevenLabs'
 * library, "Haytham". Add one entry here (with its own env var) for each
 * additional Arabic or English voice MOVO adopts later — resolveElevenLabsVoiceId
 * already looks up by language, so new slots need no changes to calling
 * code. Multiple voices per language (e.g. picked by gender/style) can be
 * added the same way once MOVO has more than one configured per language;
 * resolveElevenLabsVoiceId's lookup would then also take gender/style, but
 * that refinement is intentionally deferred until there is a second real
 * voice to choose between.
 */
export const ELEVENLABS_VOICE_SLOTS: readonly ElevenLabsVoiceSlot[] = [
  {
    language: "ar",
    label: "Haytham — MOVO's default Arabic advertising voice",
    envVar: "ELEVENLABS_ARABIC_VOICE_ID",
    // Haytham is MOVO's Egyptian voice — narration written for him must sound
    // like natural spoken Egyptian Arabic (see lib/ai/prompt-builder.ts),
    // never Modern Standard Arabic. onScreenText is unaffected by this.
    narrationDialect: "egyptian",
  },
];

export class ElevenLabsVoiceNotConfiguredError extends Error {
  constructor(public readonly language: NarrationLanguage) {
    super(
      `No ElevenLabs voice id is configured for language "${language}". ` +
        "Set the matching env var (see lib/audio/providers/elevenlabs-voice-config.ts's ELEVENLABS_VOICE_SLOTS) " +
        "with the voice's real ElevenLabs voice id before requesting ElevenLabs narration in this language.",
    );
    this.name = "ElevenLabsVoiceNotConfiguredError";
  }
}

/**
 * Resolves the real ElevenLabs voice id to use for a language, reading its
 * env var fresh on every call (never cached) so tests can freely reassign
 * process.env. Throws ElevenLabsVoiceNotConfiguredError — never returns a
 * guessed or hardcoded id — when nothing is configured yet, so
 * ../tts-fallback.ts's provider chain can catch this and move on to the
 * next provider instead of silently using the wrong voice or failing the
 * whole request.
 */
export function resolveElevenLabsVoiceId(language: NarrationLanguage): string {
  const slot = ELEVENLABS_VOICE_SLOTS.find((s) => s.language === language);
  const value = slot ? process.env[slot.envVar]?.trim() : undefined;
  if (!value) throw new ElevenLabsVoiceNotConfiguredError(language);
  return value;
}

/** Non-throwing check for whether a real ElevenLabs voice is usable for this language right now — used to decide whether it's worth attempting continuous narration synthesis at all before spending a network round trip. */
export function isElevenLabsVoiceConfigured(language: NarrationLanguage): boolean {
  if (!process.env.ELEVENLABS_API_KEY) return false;
  try {
    resolveElevenLabsVoiceId(language);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves which spoken dialect lib/ai/prompt-builder.ts should instruct the
 * AI planner to write this language's scene *narration* in — never
 * onScreenText, which the planner always keeps in clear, neutral Arabic
 * regardless of this value.
 *
 * Mirrors ../tts-provider-factory.ts's real provider-selection behavior
 * instead of assuming: ElevenLabs is only actually used for a language once
 * ELEVENLABS_API_KEY is set *and* that language's voice id is configured
 * (the same "set and non-blank" check resolveElevenLabsVoiceId above makes)
 * — otherwise a real request would fall back to OpenAI TTS or the silent
 * provider, neither of which has any dialect identity yet, so "neutral" is
 * the only honest answer. Dialect comes from the matched slot's own
 * `narrationDialect`, so this is never a blanket "language is Arabic ->
 * Egyptian" rule: configuring a future voice with a different dialect (or
 * for a different language) needs no change here or in the planner prompt.
 *
 * `slots` defaults to the real configured slots and only exists as a
 * parameter so tests can prove that behavior with a synthetic slot instead
 * of mutating the real, shared ELEVENLABS_VOICE_SLOTS list.
 */
export function resolveNarrationDialectPolicy(
  language: NarrationLanguage,
  slots: readonly ElevenLabsVoiceSlot[] = ELEVENLABS_VOICE_SLOTS,
): NarrationDialect {
  if (!process.env.ELEVENLABS_API_KEY) return "neutral";
  const slot = slots.find((s) => s.language === language);
  if (!slot) return "neutral";
  if (!process.env[slot.envVar]?.trim()) return "neutral";
  return slot.narrationDialect;
}
