import { describe, expect, it } from "vitest";
import { estimateNarrationSeconds } from "@/lib/audio/narration-timing";

describe("estimateNarrationSeconds", () => {
  it("returns 0 for empty/whitespace-only text", () => {
    expect(estimateNarrationSeconds("", "en", "normal")).toBe(0);
    expect(estimateNarrationSeconds("   ", "en", "normal")).toBe(0);
  });

  it("is deterministic for the same input", () => {
    const a = estimateNarrationSeconds("Turn any idea into a video today", "en", "normal");
    const b = estimateNarrationSeconds("Turn any idea into a video today", "en", "normal");
    expect(a).toBe(b);
  });

  it("longer text takes longer to speak", () => {
    const short = estimateNarrationSeconds("Buy now", "en", "normal");
    const long = estimateNarrationSeconds("Buy now and get a special discount for a limited time only", "en", "normal");
    expect(long).toBeGreaterThan(short);
  });

  it("orders pace tiers correctly: fast < normal < slow for the same text", () => {
    const text = "This is a sample line of narration used for pacing comparisons";
    const fast = estimateNarrationSeconds(text, "en", "fast");
    const normal = estimateNarrationSeconds(text, "en", "normal");
    const slow = estimateNarrationSeconds(text, "en", "slow");
    expect(fast).toBeLessThan(normal);
    expect(normal).toBeLessThan(slow);
  });

  it("never returns less than the minimum floor, even for a single short word", () => {
    expect(estimateNarrationSeconds("Hi", "en", "fast")).toBeGreaterThanOrEqual(0.6);
  });

  it("Arabic narration metadata: the same word count takes at least as long in Arabic as in English", () => {
    const english = estimateNarrationSeconds("one two three four five six seven eight", "en", "normal");
    const arabic = estimateNarrationSeconds("واحد اثنان ثلاثة أربعة خمسة ستة سبعة ثمانية", "ar", "normal");
    expect(arabic).toBeGreaterThan(english);
  });

  it("English narration metadata: defaults to the normal pace's words-per-minute rate", () => {
    // 160 wpm at "normal" => 16 words takes 6s of speech + 0.35s padding.
    const sixteenWords = Array.from({ length: 16 }, () => "word").join(" ");
    expect(estimateNarrationSeconds(sixteenWords, "en", "normal")).toBeCloseTo(6.35, 1);
  });
});
