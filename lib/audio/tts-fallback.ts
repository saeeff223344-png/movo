import type { TtsProvider, TtsRequest, TtsResult } from "./types";

/**
 * Tries each provider in order, moving to the next on any failure — a
 * network error, an unconfigured ElevenLabs voice for the requested
 * language (see providers/elevenlabs-voice-config.ts), a bad/missing API
 * key, a rate limit, anything — instead of failing the whole narration
 * request just because the preferred provider couldn't serve it this time.
 *
 * Deliberately provider-agnostic and dependency-free (no "server-only"
 * import, no concrete provider class) so it's fully unit-testable with
 * in-memory fake providers — see tts-provider-factory.ts's
 * synthesizeNarration for the real, server-only wiring that calls this
 * with the actual configured chain (which always ends with
 * SilentFallbackTtsProvider, guaranteeing this can never reject when
 * called that way).
 */
export async function synthesizeWithFallback(request: TtsRequest, providers: readonly TtsProvider[]): Promise<TtsResult> {
  let lastError: unknown;

  for (const provider of providers) {
    try {
      return await provider.synthesize(request);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Every TTS provider failed.");
}
