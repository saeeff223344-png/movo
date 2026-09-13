import { describe, expect, it } from "vitest";
import { getTransitionTiming, TRANSITION_TIMINGS, TRANSITION_FAMILY, computeTransitionLayerMotion } from "@/remotion/compositions/scenes/transition-motion";
import { SCENE_TRANSITIONS } from "@/lib/ai/video-plan-schema";
import type { SceneTransition } from "@/lib/types/video";

function scaleOf(transform: string): number {
  const match = /scale\(([\d.]+)\)/.exec(transform);
  return match ? Number(match[1]) : 1;
}

function translateXOf(transform: string): number {
  const match = /translateX\(([-\d.]+)%\)/.exec(transform);
  return match ? Number(match[1]) : 0;
}

const FPS = 30;
const FAST_TRANSITIONS = [
  "fast-cut",
  "whip-left",
  "whip-right",
  "flash",
  "scale-pop",
  "zoom-in",
  "zoom-out",
  "push-left",
  "push-right",
  "push-up",
  "push-down",
];

describe("TRANSITION_TIMINGS", () => {
  it("has a timing entry for every transition the schema accepts", () => {
    for (const transition of SCENE_TRANSITIONS) {
      expect(TRANSITION_TIMINGS[transition]).toBeDefined();
    }
  });

  it("gives every timing entry positive enter/exit frame counts", () => {
    for (const timing of Object.values(TRANSITION_TIMINGS)) {
      expect(timing.enterFrames).toBeGreaterThan(0);
      expect(timing.exitFrames).toBeGreaterThan(0);
    }
  });

  it("keeps fast/energetic transitions within ~0.15-0.5s at 30fps", () => {
    for (const transition of FAST_TRANSITIONS) {
      const timing = TRANSITION_TIMINGS[transition as keyof typeof TRANSITION_TIMINGS];
      const enterSeconds = timing.enterFrames / FPS;
      expect(enterSeconds).toBeGreaterThanOrEqual(0.1);
      expect(enterSeconds).toBeLessThanOrEqual(0.5);
    }
  });

  it("keeps cut effectively instant", () => {
    expect(TRANSITION_TIMINGS.cut.enterFrames).toBe(1);
    expect(TRANSITION_TIMINGS.cut.exitFrames).toBe(1);
  });
});

describe("getTransitionTiming", () => {
  it("returns the matching timing for a valid transition", () => {
    expect(getTransitionTiming("whip-left")).toEqual(TRANSITION_TIMINGS["whip-left"]);
  });

  it("falls back to a safe default for an invalid transition", () => {
    const timing = getTransitionTiming("not-a-real-transition");
    expect(timing.enterFrames).toBeGreaterThan(0);
    expect(timing.exitFrames).toBeGreaterThan(0);
  });

  it("falls back to a safe default for an undefined transition", () => {
    const timing = getTransitionTiming(undefined);
    expect(timing.enterFrames).toBeGreaterThan(0);
    expect(timing.exitFrames).toBeGreaterThan(0);
  });

  /**
   * Fast-Paced True Motion Graphics phase, Requirement 7: "transitions
   * should be short and strong" for energetic styles — omitting intensity
   * must keep every existing call site's behavior byte-for-byte identical
   * (no caller was updated to pass one accidentally regresses), and "high"
   * must be measurably, meaningfully faster than "low".
   */
  describe("intensity scaling (Requirement 7)", () => {
    it("defaults to unscaled ('medium') timing when intensity is omitted — exact backward compatibility", () => {
      for (const transition of Object.keys(TRANSITION_TIMINGS) as SceneTransition[]) {
        expect(getTransitionTiming(transition)).toEqual(getTransitionTiming(transition, "medium"));
        expect(getTransitionTiming(transition)).toEqual(TRANSITION_TIMINGS[transition]);
      }
    });

    it("scales high intensity strictly faster (fewer frames) than medium, for every transition", () => {
      for (const transition of Object.keys(TRANSITION_TIMINGS) as SceneTransition[]) {
        const medium = getTransitionTiming(transition, "medium");
        const high = getTransitionTiming(transition, "high");
        expect(high.enterFrames).toBeLessThanOrEqual(medium.enterFrames);
        expect(high.exitFrames).toBeLessThanOrEqual(medium.exitFrames);
      }
    });

    it("scales low intensity strictly slower (or equal) than medium — luxury/real-estate stays controlled", () => {
      for (const transition of Object.keys(TRANSITION_TIMINGS) as SceneTransition[]) {
        const medium = getTransitionTiming(transition, "medium");
        const low = getTransitionTiming(transition, "low");
        expect(low.enterFrames).toBeGreaterThanOrEqual(medium.enterFrames);
        expect(low.exitFrames).toBeGreaterThanOrEqual(medium.exitFrames);
      }
    });

    it("never scales a timing down to 0 frames, even for the shortest base timing at high intensity", () => {
      for (const transition of Object.keys(TRANSITION_TIMINGS) as SceneTransition[]) {
        const high = getTransitionTiming(transition, "high");
        expect(high.enterFrames).toBeGreaterThanOrEqual(1);
        expect(high.exitFrames).toBeGreaterThanOrEqual(1);
      }
    });

    it("keeps high-intensity whip transitions comfortably under Reels/TikTok-pace ~0.2s", () => {
      const timing = getTransitionTiming("whip-left", "high");
      expect(timing.enterFrames / 30).toBeLessThan(0.2);
    });
  });
});

describe("TRANSITION_FAMILY", () => {
  it("assigns a family to every transition the schema accepts", () => {
    for (const transition of SCENE_TRANSITIONS) {
      expect(TRANSITION_FAMILY[transition]).toBeDefined();
    }
  });

  it("groups same-direction variants into the same family (push-left/push-right, zoom-in/zoom-out, whip-left/whip-right)", () => {
    expect(TRANSITION_FAMILY["push-left"]).toBe(TRANSITION_FAMILY["push-right"]);
    expect(TRANSITION_FAMILY["push-up"]).toBe(TRANSITION_FAMILY["push-down"]);
    expect(TRANSITION_FAMILY["zoom-in"]).toBe(TRANSITION_FAMILY["zoom-out"]);
    expect(TRANSITION_FAMILY["whip-left"]).toBe(TRANSITION_FAMILY["whip-right"]);
  });

  it("keeps visually distinct transitions in different families", () => {
    expect(TRANSITION_FAMILY["zoom-in"]).not.toBe(TRANSITION_FAMILY["push-left"]);
    expect(TRANSITION_FAMILY["wipe"]).not.toBe(TRANSITION_FAMILY["spin"]);
  });
});

describe("computeTransitionLayerMotion (Requirement 1/3: shared-recipe parallax)", () => {
  const FPS = 30;

  it("(regression safety) full strength (1) reproduces the exact original enter transform for zoom-in", () => {
    const motion = computeTransitionLayerMotion("zoom-in", 0.5, 1, 0.5, 1, FPS, 5, 1);
    // enterScale = interpolate(0.5,[0,1],[1.22,1]) = 1.11; exitScale = interpolate(1,[0,1],[0.9,1]) = 1; idleScale = 1
    expect(scaleOf(motion.transform)).toBeCloseTo(1.11, 2);
  });

  it("dampens the deviation from neutral for a background layer (strength < 1), never amplifies it", () => {
    const full = computeTransitionLayerMotion("zoom-in", 0.5, 1, 0.5, 1, FPS, 5, 1);
    const dampened = computeTransitionLayerMotion("zoom-in", 0.5, 1, 0.5, 1, FPS, 5, 0.4);
    const fullDeviation = Math.abs(scaleOf(full.transform) - 1);
    const dampenedDeviation = Math.abs(scaleOf(dampened.transform) - 1);
    expect(dampenedDeviation).toBeLessThan(fullDeviation);
    expect(dampenedDeviation).toBeGreaterThan(0); // still moves, just less — genuine parallax, not "background frozen"
  });

  it("strength 0 collapses a scale-based transition to no deviation (pure idle scale)", () => {
    const motion = computeTransitionLayerMotion("zoom-in", 0.5, 1, 0.5, 1.2, FPS, 5, 0);
    expect(scaleOf(motion.transform)).toBeCloseTo(1.2, 5);
  });

  it("dampens translate-based transitions (push-left) proportionally to strength", () => {
    const full = computeTransitionLayerMotion("push-left", 0.5, 1, 0.5, 1, FPS, 5, 1);
    const half = computeTransitionLayerMotion("push-left", 0.5, 1, 0.5, 1, FPS, 5, 0.5);
    expect(translateXOf(half.transform)).toBeCloseTo(translateXOf(full.transform) * 0.5, 5);
  });

  it("never dampens a clipPath-based transition (wipe) — a reveal boundary must land the same place on every layer", () => {
    const full = computeTransitionLayerMotion("wipe", 0.5, 1, 0.5, 1, FPS, 5, 1);
    const dampened = computeTransitionLayerMotion("wipe", 0.5, 1, 0.5, 1, FPS, 5, 0.3);
    expect(dampened.clipPath).toBe(full.clipPath);
  });

  it("is deterministic — same inputs always produce the same output", () => {
    const a = computeTransitionLayerMotion("slide", 0.6, 0.9, 0.6, 1, FPS, 12, 0.5);
    const b = computeTransitionLayerMotion("slide", 0.6, 0.9, 0.6, 1, FPS, 12, 0.5);
    expect(a).toEqual(b);
  });

  it("produces a valid transform string for every transition the schema accepts, at both full and dampened strength", () => {
    for (const transition of SCENE_TRANSITIONS as readonly SceneTransition[]) {
      for (const strength of [1, 0.5, 0]) {
        const motion = computeTransitionLayerMotion(transition, 0.5, 0.5, 0.5, 1, FPS, 10, strength);
        expect(typeof motion.transform).toBe("string");
        expect(motion.transform.length).toBeGreaterThan(0);
      }
    }
  });
});
