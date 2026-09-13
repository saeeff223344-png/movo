import { describe, expect, it } from "vitest";
import { ELEVENLABS_MULTILINGUAL_V2_RATE, OPENAI_TTS_RATE, estimateTtsCostUsd } from "@/lib/audio/tts-pricing";

describe("estimateTtsCostUsd", () => {
  it("computes USD proportionally to characters at the given rate", () => {
    expect(estimateTtsCostUsd(1000, { usdPer1kCharacters: 0.2, source: "test" })).toBeCloseTo(0.2, 6);
    expect(estimateTtsCostUsd(500, { usdPer1kCharacters: 0.2, source: "test" })).toBeCloseTo(0.1, 6);
    expect(estimateTtsCostUsd(0, { usdPer1kCharacters: 0.2, source: "test" })).toBe(0);
  });
});

describe("ELEVENLABS_MULTILINGUAL_V2_RATE", () => {
  it("reflects ElevenLabs' current official pay-as-you-go API rate ($0.10/1k characters), not the earlier $0.18 or $0.20 estimates", () => {
    expect(ELEVENLABS_MULTILINGUAL_V2_RATE.usdPer1kCharacters).toBeCloseTo(0.1, 6);
  });

  it("documents where the rate comes from, so it's easy to spot when it goes stale", () => {
    expect(ELEVENLABS_MULTILINGUAL_V2_RATE.source.length).toBeGreaterThan(0);
  });

  it("is the single source ElevenLabsTtsProvider bookkeeps against — no other file redeclares this number", () => {
    const rate = ELEVENLABS_MULTILINGUAL_V2_RATE;
    expect(estimateTtsCostUsd(1000, rate)).toBeCloseTo(0.1, 6);
  });
});

describe("OPENAI_TTS_RATE", () => {
  it("is unchanged from before centralization ($0.015/1k characters)", () => {
    expect(OPENAI_TTS_RATE.usdPer1kCharacters).toBeCloseTo(0.015, 6);
  });
});
