import { describe, expect, it } from "vitest";
import { isSceneCandidateForVideoDirection, selectScenesForVideoGeneration } from "@/lib/video-director/eligibility";
import type { SceneMotionDirection } from "@/lib/video-director/types";

describe("isSceneCandidateForVideoDirection", () => {
  it("requires a resolved still visual — nothing to animate without one", () => {
    expect(isSceneCandidateForVideoDirection("hook", false)).toBe(false);
    expect(isSceneCandidateForVideoDirection("hook", true)).toBe(true);
  });

  it("excludes always-typography purposes (price/discount/logo) even with a resolved visual", () => {
    expect(isSceneCandidateForVideoDirection("price-scene", true)).toBe(false);
    expect(isSceneCandidateForVideoDirection("discount-badge", true)).toBe(false);
    expect(isSceneCandidateForVideoDirection("logo-reveal", true)).toBe(false);
  });

  it("still allows cta-scene and kinetic-headline as candidates (the director decides case by case)", () => {
    expect(isSceneCandidateForVideoDirection("cta-scene", true)).toBe(true);
    expect(isSceneCandidateForVideoDirection("kinetic-headline", true)).toBe(true);
  });

  it("allows every other purpose with a resolved visual", () => {
    for (const purpose of ["product-reveal", "product-card", "phone-mockup", "app-screenshot", "split-screen", "feature-list", "hook"] as const) {
      expect(isSceneCandidateForVideoDirection(purpose, true)).toBe(true);
    }
  });
});

function direction(overrides: Partial<SceneMotionDirection> = {}): SceneMotionDirection {
  return {
    sceneId: "s1",
    recommendation: "RUNWAY_VIDEO",
    reason: "test",
    motionSubject: "coffee",
    primaryAction: "pours",
    secondaryActions: [],
    environmentalMotion: null,
    cameraMotion: null,
    intensity: "moderate",
    realismPriority: 0.5,
    preserveProductIdentity: true,
    negativeConstraints: [],
    runwayPrompt: "the liquid pours",
    ...overrides,
  };
}

describe("selectScenesForVideoGeneration (Requirement 6: cost control safety net)", () => {
  it("never returns more than maxScenes, no matter how many the director recommended", () => {
    const directions = [
      direction({ sceneId: "s1" }),
      direction({ sceneId: "s2" }),
      direction({ sceneId: "s3" }),
      direction({ sceneId: "s4" }),
    ];
    const selected = selectScenesForVideoGeneration(directions, 2);
    expect(selected).toHaveLength(2);
  });

  it("excludes REMOTION_ONLY recommendations entirely", () => {
    const directions = [direction({ sceneId: "s1", recommendation: "REMOTION_ONLY", runwayPrompt: null }), direction({ sceneId: "s2" })];
    const selected = selectScenesForVideoGeneration(directions, 5);
    expect(selected.map((d) => d.sceneId)).toEqual(["s2"]);
  });

  it("excludes a RUNWAY_VIDEO recommendation that is missing a runwayPrompt (defensive — should not happen, but never send nothing to the provider)", () => {
    const directions = [direction({ sceneId: "s1", runwayPrompt: null })];
    const selected = selectScenesForVideoGeneration(directions, 5);
    expect(selected).toHaveLength(0);
  });

  it("ranks by realismPriority, highest first", () => {
    const directions = [
      direction({ sceneId: "low", realismPriority: 0.2 }),
      direction({ sceneId: "high", realismPriority: 0.9 }),
      direction({ sceneId: "mid", realismPriority: 0.5 }),
    ];
    const selected = selectScenesForVideoGeneration(directions, 3);
    expect(selected.map((d) => d.sceneId)).toEqual(["high", "mid", "low"]);
  });

  it("keeps original scene order for ties (stable sort, never Math.random())", () => {
    const directions = [
      direction({ sceneId: "a", realismPriority: 0.5 }),
      direction({ sceneId: "b", realismPriority: 0.5 }),
      direction({ sceneId: "c", realismPriority: 0.5 }),
    ];
    expect(selectScenesForVideoGeneration(directions, 3).map((d) => d.sceneId)).toEqual(["a", "b", "c"]);
  });

  it("treats a null realismPriority as the lowest priority", () => {
    const directions = [direction({ sceneId: "null-priority", realismPriority: null }), direction({ sceneId: "has-priority", realismPriority: 0.1 })];
    const selected = selectScenesForVideoGeneration(directions, 1);
    expect(selected.map((d) => d.sceneId)).toEqual(["has-priority"]);
  });

  it("returns an empty array when there are no RUNWAY_VIDEO recommendations at all", () => {
    expect(selectScenesForVideoGeneration([], 5)).toEqual([]);
  });

  it("returns an empty array when maxScenes is 0", () => {
    expect(selectScenesForVideoGeneration([direction()], 0)).toEqual([]);
  });
});
