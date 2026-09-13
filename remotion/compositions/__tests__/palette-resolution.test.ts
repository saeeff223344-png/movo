import { describe, expect, it } from "vitest";
import { resolvePlanPalette, resolveScenePalette, hexToRgba } from "../palette-resolution";
import { AD_PALETTES } from "../ad-styles";

describe("resolvePlanPalette", () => {
  it("falls back to AD_PALETTES[visualStyle] when neither brandColors nor palette is set (pre-existing persisted plans)", () => {
    const resolved = resolvePlanPalette({ visualStyle: "luxury", brandColors: null, palette: null });
    expect(resolved.background).toBe(AD_PALETTES.luxury.background);
    expect(resolved.accent).toBe(AD_PALETTES.luxury.accent);
  });

  it("prefers the AI's own deliberate palette over the fixed style default", () => {
    const resolved = resolvePlanPalette({
      visualStyle: "fast",
      brandColors: null,
      palette: { background: "#2b1a0f", backgroundEnd: "#5c2e12", accent: "#e8641c", secondaryAccent: "#f0a34d", text: "#fff6ec" },
    });
    expect(resolved.background).toContain("#2b1a0f");
    expect(resolved.background).toContain("#5c2e12");
    expect(resolved.accent).toBe("#e8641c");
    expect(resolved.secondaryAccent).toBe("#f0a34d");
    expect(resolved.text).toBe("#fff6ec");
    // Never accidentally the fixed indigo default this style would otherwise produce.
    expect(resolved.background).not.toContain("5b24e0");
  });

  it("prioritizes brandColors over the AI's own palette choice when both are present", () => {
    const resolved = resolvePlanPalette({
      visualStyle: "tech",
      brandColors: ["#123456", "#abcdef"],
      palette: { background: "#000000", backgroundEnd: "#111111", accent: "#222222", secondaryAccent: "#333333", text: "#ffffff" },
    });
    expect(resolved.background).toContain("#123456");
    expect(resolved.accent).toBe("#abcdef");
  });

  it("derives a usable palette from a single brand color", () => {
    const resolved = resolvePlanPalette({ visualStyle: "minimal", brandColors: ["#ff0000"], palette: null });
    expect(resolved.background).toContain("#ff0000");
    expect(resolved.accent).toBe("#ff0000");
    expect(resolved.badgeText === "#0a0a13" || resolved.badgeText === "#ffffff").toBe(true);
  });

  it("keeps the style's own motion/pattern personality regardless of color source", () => {
    const withPalette = resolvePlanPalette({
      visualStyle: "luxury",
      brandColors: null,
      palette: { background: "#010101", backgroundEnd: "#020202", accent: "#030303", secondaryAccent: "#040404", text: "#ffffff" },
    });
    expect(withPalette.springStiffness).toBe(AD_PALETTES.luxury.springStiffness);
    expect(withPalette.pattern).toBe(AD_PALETTES.luxury.pattern);
  });

  it("picks a legible badge text color against a light accent", () => {
    const resolved = resolvePlanPalette({ visualStyle: "fast", brandColors: null, palette: { background: "#111111", backgroundEnd: "#222222", accent: "#fef9e7", secondaryAccent: "#fef9e7", text: "#ffffff" } });
    expect(resolved.badgeText).toBe("#0a0a13");
  });
});

describe("resolveScenePalette", () => {
  const base = resolvePlanPalette({
    visualStyle: "fast",
    brandColors: null,
    palette: { background: "#101010", backgroundEnd: "#202020", accent: "#e8641c", secondaryAccent: "#f0a34d", text: "#ffffff" },
  });

  it("is deterministic for the same scene id", () => {
    expect(resolveScenePalette(base, "scene-1")).toEqual(resolveScenePalette(base, "scene-1"));
  });

  it("keeps accent/text/badge identity unchanged across scenes", () => {
    const a = resolveScenePalette(base, "scene-1");
    const b = resolveScenePalette(base, "scene-2");
    expect(a.accent).toBe(b.accent);
    expect(a.text).toBe(b.text);
    expect(a.badgeBg).toBe(b.badgeBg);
  });

  it("is a no-op for a palette with no backgroundStops (old AD_PALETTES-only resolution)", () => {
    const plain = AD_PALETTES.fast;
    expect(resolveScenePalette(plain, "scene-1")).toBe(plain);
  });

  it("varies the background gradient between at least some different scene ids", () => {
    const backgrounds = new Set(["scene-1", "scene-2", "scene-3", "scene-4", "scene-5"].map((id) => resolveScenePalette(base, id).background));
    expect(backgrounds.size).toBeGreaterThan(1);
  });
});

describe("hexToRgba", () => {
  it("converts a hex color with the given alpha", () => {
    expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("falls back to a neutral gray for a malformed hex rather than throwing", () => {
    expect(() => hexToRgba("not-a-color", 0.5)).not.toThrow();
  });
});
