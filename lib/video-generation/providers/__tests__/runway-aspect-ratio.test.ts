import { describe, expect, it } from "vitest";
import { toRunwayRatio } from "@/lib/video-generation/providers/runway-aspect-ratio";

describe("toRunwayRatio", () => {
  it("maps every MOVO aspect ratio to a valid Runway gen4_turbo ratio enum value", () => {
    const VALID_RUNWAY_RATIOS = new Set(["1280:720", "720:1280", "1104:832", "832:1104", "960:960", "1584:672"]);
    for (const ratio of ["9:16", "16:9", "1:1"] as const) {
      expect(VALID_RUNWAY_RATIOS.has(toRunwayRatio(ratio))).toBe(true);
    }
  });

  it("maps 9:16 (MOVO's default vertical Reels format) to Runway's portrait ratio", () => {
    expect(toRunwayRatio("9:16")).toBe("720:1280");
  });

  it("maps 16:9 to Runway's landscape ratio", () => {
    expect(toRunwayRatio("16:9")).toBe("1280:720");
  });

  it("maps 1:1 to Runway's square ratio", () => {
    expect(toRunwayRatio("1:1")).toBe("960:960");
  });
});
