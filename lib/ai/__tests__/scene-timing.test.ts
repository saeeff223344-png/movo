import { describe, expect, it } from "vitest";
import { secondsToFrames } from "@/lib/ai/scene-timing";

describe("secondsToFrames", () => {
  it("multiplies seconds by fps and rounds to the nearest frame", () => {
    expect(secondsToFrames(4, 30)).toBe(120);
    expect(secondsToFrames(1.5, 30)).toBe(45);
  });

  it("rounds rather than truncates", () => {
    expect(secondsToFrames(1.016, 30)).toBe(30); // 30.48 -> 30
    expect(secondsToFrames(1.02, 30)).toBe(31); // 30.6 -> 31
  });

  it("never returns 0 for a positive duration", () => {
    expect(secondsToFrames(0.01, 30)).toBe(1);
  });
});
