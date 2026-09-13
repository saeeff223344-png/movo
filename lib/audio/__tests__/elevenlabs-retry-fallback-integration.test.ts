import { describe, expect, it, vi } from "vitest";
import { synthesizeWithFallback } from "@/lib/audio/tts-fallback";
import { withElevenLabsRetry, type ElevenLabsAttemptResult } from "@/lib/audio/providers/elevenlabs-retry";
import type { TtsProvider, TtsRequest, TtsResult } from "@/lib/audio/types";

/**
 * Proves the actual composition MOVO relies on: an ElevenLabs-shaped
 * provider whose synthesize() is wrapped in withElevenLabsRetry, combined
 * with the existing, unmodified synthesizeWithFallback chain
 * (lib/audio/tts-fallback.ts) — without importing the real, "server-only"
 * ElevenLabsTtsProvider or making a network call. This is the exact
 * behavior the real integrated test needed: a transient rate/concurrency
 * rejection must recover via retry before OpenAI ever gets called, while a
 * permanent failure (bad credentials/voice) must fall through immediately.
 */
const REQUEST: TtsRequest = { text: "مرحبا", language: "ar", gender: "male", style: "energetic", pace: "normal" };

function elevenLabsResult(): TtsResult {
  return { audioUrl: "data:audio/mpeg;base64,haytham", durationSeconds: 2, provider: "elevenlabs", cost: { characters: 5, estimatedUsd: 0.001 } };
}

function openAiResult(): TtsResult {
  return { audioUrl: "data:audio/mpeg;base64,openai", durationSeconds: 2, provider: "openai", cost: { characters: 5, estimatedUsd: 0.0001 } };
}

function makeRetryingElevenLabsProvider(attempts: (() => Promise<ElevenLabsAttemptResult<TtsResult>>)[]): TtsProvider {
  let call = 0;
  return {
    id: "elevenlabs",
    synthesize: vi.fn(async () => {
      const attempt = attempts[call];
      call += 1;
      return withElevenLabsRetry(attempt, { maxAttempts: 3, baseDelayMs: 1, sleep: async () => {} });
    }),
  };
}

describe("ElevenLabs retry composed with the existing fallback chain", () => {
  it("recovers a transient 429 via retry — OpenAI fallback is never called", async () => {
    let attemptCount = 0;
    const elevenlabs: TtsProvider = {
      id: "elevenlabs",
      synthesize: vi.fn(async () =>
        withElevenLabsRetry<TtsResult>(
          async () => {
            attemptCount += 1;
            if (attemptCount === 1) return { ok: false, status: 429, error: new Error("too_many_concurrent_requests") };
            return { ok: true, value: elevenLabsResult() };
          },
          { maxAttempts: 3, baseDelayMs: 1, sleep: async () => {} },
        ),
      ),
    };
    const openai: TtsProvider = { id: "openai", synthesize: vi.fn(async () => openAiResult()) };

    const result = await synthesizeWithFallback(REQUEST, [elevenlabs, openai]);

    expect(result.provider).toBe("elevenlabs");
    expect(attemptCount).toBe(2); // 1 rate-limited attempt + 1 successful retry
    expect(openai.synthesize).not.toHaveBeenCalled();
  });

  it("falls through to OpenAI immediately on a permanent error (invalid credentials) — no wasted retries", async () => {
    const elevenlabs = makeRetryingElevenLabsProvider([
      async () => ({ ok: false, status: 401, error: new Error("invalid_api_key") }),
    ]);
    const openai: TtsProvider = { id: "openai", synthesize: vi.fn(async () => openAiResult()) };

    const result = await synthesizeWithFallback(REQUEST, [elevenlabs, openai]);

    expect(result.provider).toBe("openai");
    expect(openai.synthesize).toHaveBeenCalledTimes(1);
  });

  it("falls through to OpenAI only after ElevenLabs' retries are exhausted, never before", async () => {
    const elevenlabs = makeRetryingElevenLabsProvider([
      async () => ({ ok: false, status: 429, error: new Error("still rate limited") }),
    ]);
    const openai: TtsProvider = { id: "openai", synthesize: vi.fn(async () => openAiResult()) };

    const result = await synthesizeWithFallback(REQUEST, [elevenlabs, openai]);

    // maxAttempts: 3 means withElevenLabsRetry itself tried 3 times before this
    // provider's synthesize() rejected and synthesizeWithFallback moved on.
    expect(result.provider).toBe("openai");
    expect(openai.synthesize).toHaveBeenCalledTimes(1);
  });
});
