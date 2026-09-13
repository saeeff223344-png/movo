import { describe, expect, it } from "vitest";
import { getMotionProfile, MOTION_PROFILE_BY_STYLE, pickTextRevealStyle, getMotionIntensity, MOTION_INTENSITY_BY_STYLE } from "@/remotion/compositions/scenes/motion-profiles";
import type { AdStyle } from "@/remotion/compositions/ad-types";

const STYLES: AdStyle[] = ["fast", "energetic", "luxury", "fun", "tech", "minimal"];

describe("MOTION_PROFILE_BY_STYLE", () => {
  it("has a profile for every AdStyle", () => {
    for (const style of STYLES) {
      expect(MOTION_PROFILE_BY_STYLE[style]).toBeDefined();
    }
  });

  it("luxury reads slower/more deliberate than fast/energetic (larger stagger, lower idle motion scale)", () => {
    const luxury = getMotionProfile("luxury");
    const fast = getMotionProfile("fast");
    const energetic = getMotionProfile("energetic");
    expect(luxury.layerStaggerFrames).toBeGreaterThan(fast.layerStaggerFrames);
    expect(luxury.layerStaggerFrames).toBeGreaterThan(energetic.layerStaggerFrames);
    expect(luxury.idleMotionScale).toBeLessThan(fast.idleMotionScale);
    expect(luxury.idleMotionScale).toBeLessThan(energetic.idleMotionScale);
  });

  it("luxury defaults to a mask reveal, not a bouncy word reveal", () => {
    expect(getMotionProfile("luxury").textReveal).toBe("mask");
  });

  it("every profile's parallaxStrength is a valid 0-1 fraction", () => {
    for (const style of STYLES) {
      const { parallaxStrength } = getMotionProfile(style);
      expect(parallaxStrength).toBeGreaterThan(0);
      expect(parallaxStrength).toBeLessThanOrEqual(1);
    }
  });

  it("every profile has a positive stagger and idle motion scale", () => {
    for (const style of STYLES) {
      const profile = getMotionProfile(style);
      expect(profile.layerStaggerFrames).toBeGreaterThan(0);
      expect(profile.wordStaggerFrames).toBeGreaterThan(0);
      expect(profile.idleMotionScale).toBeGreaterThan(0);
    }
  });
});

describe("pickTextRevealStyle", () => {
  it("is deterministic — the same scene id always yields the same reveal style", () => {
    const profile = getMotionProfile("luxury");
    expect(pickTextRevealStyle("scene-1", profile)).toBe(pickTextRevealStyle("scene-1", profile));
  });

  it("stays on the profile's own default for most scene ids", () => {
    const profile = getMotionProfile("tech");
    const ids = Array.from({ length: 30 }, (_, i) => `scene-${i}`);
    const onDefault = ids.filter((id) => pickTextRevealStyle(id, profile) === profile.textReveal).length;
    expect(onDefault).toBeGreaterThan(ids.length / 2);
  });

  it("never returns a reveal style outside the known set", () => {
    const profile = getMotionProfile("fun");
    const VALID = new Set(["word", "line", "mask", "punch"]);
    for (let i = 0; i < 20; i++) {
      expect(VALID.has(pickTextRevealStyle(`s${i}`, profile))).toBe(true);
    }
  });

  it("does deviate from the default for at least some scene ids (real variety, not always-default)", () => {
    const profile = getMotionProfile("minimal");
    const ids = Array.from({ length: 30 }, (_, i) => `variety-${i}`);
    const deviations = ids.filter((id) => pickTextRevealStyle(id, profile) !== profile.textReveal);
    expect(deviations.length).toBeGreaterThan(0);
  });
});

/**
 * Fast-Paced True Motion Graphics phase, Requirement 9: "low: luxury /
 * real estate. medium: beauty / premium product. high: restaurant /
 * coffee / retail / app / promo." VideoPlan only carries `visualStyle`
 * (no literal business-category field), so this locks down the concrete
 * mapping onto the 6 AdStyle values every other creative decision already
 * keys off — luxury stays the sole deliberately-calm exception, matching
 * "Do NOT make every style hyperactive... luxury/real-estate can remain
 * controlled."
 */
describe("getMotionIntensity / MOTION_INTENSITY_BY_STYLE", () => {
  it("has an intensity for every AdStyle", () => {
    for (const style of STYLES) {
      expect(MOTION_INTENSITY_BY_STYLE[style]).toBeDefined();
    }
  });

  it("keeps luxury as the calm/low-intensity exception", () => {
    expect(getMotionIntensity("luxury")).toBe("low");
  });

  it("defaults fast/energetic/fun (retail/food/promo-adjacent) to high intensity", () => {
    expect(getMotionIntensity("fast")).toBe("high");
    expect(getMotionIntensity("energetic")).toBe("high");
    expect(getMotionIntensity("fun")).toBe("high");
  });

  it("keeps every MotionProfile's own `intensity` field consistent with getMotionIntensity", () => {
    for (const style of STYLES) {
      expect(getMotionProfile(style).intensity).toBe(getMotionIntensity(style));
    }
  });

  it("high-intensity styles stagger layers and words strictly faster than low-intensity luxury", () => {
    const luxury = getMotionProfile("luxury");
    for (const style of ["fast", "energetic", "fun"] as AdStyle[]) {
      const profile = getMotionProfile(style);
      expect(profile.layerStaggerFrames).toBeLessThan(luxury.layerStaggerFrames);
      expect(profile.wordStaggerFrames).toBeLessThan(luxury.wordStaggerFrames);
    }
  });

  it("high-intensity styles default to the punch text reveal", () => {
    for (const style of ["fast", "energetic", "fun"] as AdStyle[]) {
      expect(getMotionProfile(style).textReveal).toBe("punch");
    }
  });
});
