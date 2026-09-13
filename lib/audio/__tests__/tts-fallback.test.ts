import { describe, expect, it, vi } from "vitest";
import { synthesizeWithFallback } from "@/lib/audio/tts-fallback";
import type { TtsProvider, TtsRequest, TtsResult } from "@/lib/audio/types";

const REQUEST: TtsRequest = { text: "Hello", language: "en", gender: "female", style: "warm", pace: "normal" };

function fakeProvider(id: TtsResult["provider"], behavior: (() => Promise<TtsResult>) | Error): TtsProvider {
  return {
    id,
    synthesize: vi.fn(async () => {
      if (behavior instanceof Error) throw behavior;
      return behavior();
    }),
  };
}

function fakeResult(provider: TtsResult["provider"]): TtsResult {
  return { audioUrl: `fake://${provider}`, durationSeconds: 1, provider, cost: { characters: 5, estimatedUsd: null } };
}

describe("synthesizeWithFallback", () => {
  it("returns the first provider's result when it succeeds, without calling any other provider", async () => {
    const first = fakeProvider("elevenlabs", async () => fakeResult("elevenlabs"));
    const second = fakeProvider("openai", async () => fakeResult("openai"));

    const result = await synthesizeWithFallback(REQUEST, [first, second]);

    expect(result.provider).toBe("elevenlabs");
    expect(second.synthesize).not.toHaveBeenCalled();
  });

  it("falls back to the next provider when the first one throws", async () => {
    const first = fakeProvider("elevenlabs", new Error("voice not configured"));
    const second = fakeProvider("openai", async () => fakeResult("openai"));

    const result = await synthesizeWithFallback(REQUEST, [first, second]);

    expect(result.provider).toBe("openai");
    expect(first.synthesize).toHaveBeenCalledTimes(1);
  });

  it("falls all the way through to the last provider when every earlier one throws", async () => {
    const first = fakeProvider("elevenlabs", new Error("down"));
    const second = fakeProvider("openai", new Error("also down"));
    const third = fakeProvider("silent-fallback", async () => fakeResult("silent-fallback"));

    const result = await synthesizeWithFallback(REQUEST, [first, second, third]);

    expect(result.provider).toBe("silent-fallback");
  });

  it("rejects only when every provider in the chain throws", async () => {
    const first = fakeProvider("elevenlabs", new Error("down"));
    const second = fakeProvider("openai", new Error("also down"));

    await expect(synthesizeWithFallback(REQUEST, [first, second])).rejects.toThrow("also down");
  });

  it("passes the exact request object to each provider it tries", async () => {
    const first = fakeProvider("elevenlabs", new Error("down"));
    const second = fakeProvider("openai", async () => fakeResult("openai"));

    await synthesizeWithFallback(REQUEST, [first, second]);

    expect(first.synthesize).toHaveBeenCalledWith(REQUEST);
    expect(second.synthesize).toHaveBeenCalledWith(REQUEST);
  });

  it("never calls a provider after the one that already succeeded", async () => {
    const first = fakeProvider("elevenlabs", async () => fakeResult("elevenlabs"));
    const second = fakeProvider("openai", async () => fakeResult("openai"));
    const third = fakeProvider("silent-fallback", async () => fakeResult("silent-fallback"));

    await synthesizeWithFallback(REQUEST, [first, second, third]);

    expect(second.synthesize).not.toHaveBeenCalled();
    expect(third.synthesize).not.toHaveBeenCalled();
  });
});
