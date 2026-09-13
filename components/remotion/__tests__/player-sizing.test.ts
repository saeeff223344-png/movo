import { describe, expect, it } from "vitest";
import { isPortraitOrSquare, previewMaxWidthClass } from "@/components/remotion/player-sizing";

describe("isPortraitOrSquare", () => {
  it("is true for 9:16", () => {
    expect(isPortraitOrSquare(1080, 1920)).toBe(true);
  });

  it("is true for 1:1", () => {
    expect(isPortraitOrSquare(1080, 1080)).toBe(true);
  });

  it("is false for 16:9", () => {
    expect(isPortraitOrSquare(1920, 1080)).toBe(false);
  });
});

describe("previewMaxWidthClass", () => {
  it("caps portrait/square previews narrower", () => {
    expect(previewMaxWidthClass(1080, 1920)).toBe("max-w-sm");
    expect(previewMaxWidthClass(1080, 1080)).toBe("max-w-sm");
  });

  it("gives landscape previews more width", () => {
    expect(previewMaxWidthClass(1920, 1080)).toBe("max-w-2xl");
  });
});
