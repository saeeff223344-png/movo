import type { NarrationLanguage, NarrationPace } from "./types";

/** Average spoken words/minute per pace tier, tuned for punchy ad-style delivery (brisker than relaxed conversational speech). */
const WORDS_PER_MINUTE: Record<NarrationPace, number> = {
  slow: 130,
  normal: 160,
  fast: 195,
};

/**
 * Arabic script carries more meaning per whitespace-delimited "word" than
 * English does, so at the same nominal words/minute an Arabic line takes
 * longer to actually speak. This multiplier (<1 slows the effective
 * words/second) compensates for that without needing a separate WPM table.
 */
const LANGUAGE_RATE_MULTIPLIER: Record<NarrationLanguage, number> = {
  en: 1,
  ar: 0.88,
};

const MIN_NARRATION_SECONDS = 0.6;
/** Small fixed lead/tail so a synthesized line never sounds clipped right at its own edges. */
const NARRATION_PADDING_SECONDS = 0.35;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Deterministic, word-count-based estimate of how long a narration line
 * takes to speak, in seconds. This is the one number the whole audio
 * architecture is built around: lib/audio/providers/silent-fallback-provider.ts
 * uses it as its only source of truth when no real TTS is configured, and
 * lib/audio/scene-audio-sync.ts uses it to size/adapt scene durations
 * *before* any real audio has been synthesized. Every real provider is
 * expected to produce speech close to this estimate — see
 * providers/openai-tts-provider.ts's docstring for why exact probed
 * duration isn't used instead.
 */
export function estimateNarrationSeconds(text: string, language: NarrationLanguage, pace: NarrationPace = "normal"): number {
  const words = countWords(text);
  if (words === 0) return 0;
  const wordsPerSecond = (WORDS_PER_MINUTE[pace] * LANGUAGE_RATE_MULTIPLIER[language]) / 60;
  const spokenSeconds = words / wordsPerSecond;
  return Math.max(MIN_NARRATION_SECONDS, spokenSeconds + NARRATION_PADDING_SECONDS);
}
