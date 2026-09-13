import { describe, expect, it } from "vitest";
import { AD_HEIGHT_9_16, AD_WIDTH_9_16, ASPECT_RATIO_DIMENSIONS } from "@/remotion/constants";

describe("ASPECT_RATIO_DIMENSIONS", () => {
  it("reuses the existing 9:16 demo dimensions rather than redefining them", () => {
    expect(ASPECT_RATIO_DIMENSIONS["9:16"]).toEqual({ width: AD_WIDTH_9_16, height: AD_HEIGHT_9_16 });
  });

  it("has the correct pixel ratio for every supported aspect ratio", () => {
    expect(ASPECT_RATIO_DIMENSIONS["9:16"].width / ASPECT_RATIO_DIMENSIONS["9:16"].height).toBeCloseTo(9 / 16, 5);
    expect(ASPECT_RATIO_DIMENSIONS["16:9"].width / ASPECT_RATIO_DIMENSIONS["16:9"].height).toBeCloseTo(16 / 9, 5);
    expect(ASPECT_RATIO_DIMENSIONS["1:1"].width / ASPECT_RATIO_DIMENSIONS["1:1"].height).toBeCloseTo(1, 5);
  });

  it("gives every aspect ratio even, non-fractional pixel dimensions", () => {
    for (const { width, height } of Object.values(ASPECT_RATIO_DIMENSIONS)) {
      expect(Number.isInteger(width)).toBe(true);
      expect(Number.isInteger(height)).toBe(true);
    }
  });
});
