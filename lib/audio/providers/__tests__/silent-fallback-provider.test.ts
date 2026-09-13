import { describe, expect, it } from "vitest";
import { SilentFallbackTtsProvider } from "@/lib/audio/providers/silent-fallback-provider";
import { estimateNarrationSeconds } from "@/lib/audio/narration-timing";

describe("SilentFallbackTtsProvider", () => {
  const provider = new SilentFallbackTtsProvider();

  it("identifies itself as the silent-fallback provider", () => {
    expect(provider.id).toBe("silent-fallback");
  });

  it("never fabricates audio: audioUrl is always null", async () => {
    const result = await provider.synthesize({ text: "Hello there", language: "en", gender: "female", style: "warm", pace: "normal" });
    expect(result.audioUrl).toBeNull();
    expect(result.provider).toBe("silent-fallback");
  });

  it("its durationSeconds always matches the deterministic text-based estimate", async () => {
    const request = { text: "Turn any idea into a finished ad", language: "en" as const, gender: "male" as const, style: "calm" as const, pace: "fast" as const };
    const result = await provider.synthesize(request);
    expect(result.durationSeconds).toBe(estimateNarrationSeconds(request.text, request.language, request.pace));
  });

  it("reports character count and a null cost estimate (it never bills anything)", async () => {
    const result = await provider.synthesize({ text: "12345", language: "en", gender: "female", style: "warm", pace: "normal" });
    expect(result.cost).toEqual({ characters: 5, estimatedUsd: null });
  });

  it("is deterministic: the same request always resolves to the same duration", async () => {
    const request = { text: "Same line every time", language: "en" as const, gender: "female" as const, style: "warm" as const, pace: "normal" as const };
    const [a, b] = await Promise.all([provider.synthesize(request), provider.synthesize(request)]);
    expect(a.durationSeconds).toBe(b.durationSeconds);
  });
});
