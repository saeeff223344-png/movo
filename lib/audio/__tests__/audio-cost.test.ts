import { describe, expect, it } from "vitest";
import { summarizeAudioCost } from "@/lib/audio/audio-cost";
import type { TtsResult } from "@/lib/audio/types";

function result(overrides: Partial<TtsResult> = {}): TtsResult {
  return {
    audioUrl: null,
    durationSeconds: 2,
    provider: "silent-fallback",
    cost: { characters: 10, estimatedUsd: null },
    ...overrides,
  };
}

describe("summarizeAudioCost", () => {
  it("returns all zeros and a null cost for an empty result list", () => {
    const summary = summarizeAudioCost([], null);
    expect(summary).toEqual({ narrationCharacters: 0, narrationSeconds: 0, estimatedTtsUsd: null, musicLicenseUsd: null });
  });

  it("sums characters and seconds across multiple results", () => {
    const summary = summarizeAudioCost([result({ cost: { characters: 10, estimatedUsd: null }, durationSeconds: 2 }), result({ cost: { characters: 20, estimatedUsd: null }, durationSeconds: 3 })], null);
    expect(summary.narrationCharacters).toBe(30);
    expect(summary.narrationSeconds).toBe(5);
  });

  it("sums estimatedUsd when every result has a known cost (e.g. all from a real provider)", () => {
    const summary = summarizeAudioCost(
      [
        result({ provider: "openai", cost: { characters: 100, estimatedUsd: 0.0015 } }),
        result({ provider: "openai", cost: { characters: 200, estimatedUsd: 0.003 } }),
      ],
      null,
    );
    expect(summary.estimatedTtsUsd).toBeCloseTo(0.0045, 6);
  });

  it("returns null estimatedTtsUsd when none of the results have a known cost (every line used the silent fallback)", () => {
    const summary = summarizeAudioCost([result(), result()], null);
    expect(summary.estimatedTtsUsd).toBeNull();
  });

  it("sums only the known costs when results are a mix of real and fallback providers (a partial estimate)", () => {
    const summary = summarizeAudioCost([result({ provider: "openai", cost: { characters: 100, estimatedUsd: 0.0015 } }), result()], null);
    expect(summary.estimatedTtsUsd).toBeCloseTo(0.0015, 6);
  });

  it("passes musicLicenseUsd through unchanged", () => {
    expect(summarizeAudioCost([], 5).musicLicenseUsd).toBe(5);
    expect(summarizeAudioCost([], null).musicLicenseUsd).toBeNull();
  });

  it("records ElevenLabs character usage and cost with no changes needed to this function (provider-agnostic by construction)", () => {
    const summary = summarizeAudioCost(
      [result({ provider: "elevenlabs", cost: { characters: 120, estimatedUsd: 0.0216 }, durationSeconds: 4.2 })],
      null,
    );
    expect(summary.narrationCharacters).toBe(120);
    expect(summary.narrationSeconds).toBe(4.2);
    expect(summary.estimatedTtsUsd).toBeCloseTo(0.0216, 6);
  });

  it("sums costs across a mix of ElevenLabs and OpenAI results", () => {
    const summary = summarizeAudioCost(
      [
        result({ provider: "elevenlabs", cost: { characters: 100, estimatedUsd: 0.018 } }),
        result({ provider: "openai", cost: { characters: 100, estimatedUsd: 0.0015 } }),
      ],
      null,
    );
    expect(summary.estimatedTtsUsd).toBeCloseTo(0.0195, 6);
  });
});
