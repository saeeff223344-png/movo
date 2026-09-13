import { describe, expect, it } from "vitest";
import { updateSceneField } from "@/lib/ai/plan-editing";
import type { VideoPlan } from "@/lib/ai/video-plan-schema";

function scene(overrides: Partial<VideoPlan["scenes"][number]> = {}): VideoPlan["scenes"][number] {
  return {
    id: "scene-1",
    startTime: 0,
    duration: 4,
    purpose: "hook",
    narration: "original narration",
    onScreenText: "original on-screen text",
    visualDirection: "visual",
    motionDirection: "motion",
    transition: "cut",
    assetNeeds: [],
    textPosition: "center",
    textAlign: "center",
    visual: null,
    ...overrides,
  };
}

function plan(scenes: VideoPlan["scenes"]): VideoPlan {
  return {
    language: "en",
    videoTitle: "Title",
    business: "Business",
    objective: "Objective",
    targetAudience: "Audience",
    platform: "reels",
    aspectRatio: "9:16",
    durationSeconds: 8,
    visualStyle: "tech",
    tone: "modern",
    brandColors: null,
    palette: null,
    visualTheme: null,
    cta: "Buy now",
    scenes,
    audio: null,
  };
}

describe("updateSceneField", () => {
  it("updates the narration of the targeted scene", () => {
    const before = plan([scene({ id: "s1" }), scene({ id: "s2" })]);
    const after = updateSceneField(before, "s1", "narration", "edited narration");
    expect(after.scenes[0].narration).toBe("edited narration");
  });

  it("updates the onScreenText of the targeted scene", () => {
    const before = plan([scene({ id: "s1" })]);
    const after = updateSceneField(before, "s1", "onScreenText", "edited caption");
    expect(after.scenes[0].onScreenText).toBe("edited caption");
  });

  it("leaves every other scene untouched", () => {
    const before = plan([
      scene({ id: "s1", narration: "a" }),
      scene({ id: "s2", narration: "b" }),
      scene({ id: "s3", narration: "c" }),
    ]);
    const after = updateSceneField(before, "s2", "narration", "edited");
    expect(after.scenes[0].narration).toBe("a");
    expect(after.scenes[1].narration).toBe("edited");
    expect(after.scenes[2].narration).toBe("c");
  });

  it("leaves every other field of the edited scene untouched", () => {
    const before = plan([scene({ id: "s1", onScreenText: "keep me", purpose: "cta-scene" })]);
    const after = updateSceneField(before, "s1", "narration", "new narration");
    expect(after.scenes[0].onScreenText).toBe("keep me");
    expect(after.scenes[0].purpose).toBe("cta-scene");
  });

  it("leaves every other plan-level field untouched", () => {
    const before = plan([scene({ id: "s1" })]);
    const after = updateSceneField(before, "s1", "narration", "x");
    expect(after.cta).toBe(before.cta);
    expect(after.videoTitle).toBe(before.videoTitle);
    expect(after.language).toBe(before.language);
  });

  it("does not mutate the original plan (immutable update)", () => {
    const before = plan([scene({ id: "s1", narration: "original" })]);
    updateSceneField(before, "s1", "narration", "changed");
    expect(before.scenes[0].narration).toBe("original");
  });

  it("allows clearing a field to an empty string", () => {
    const before = plan([scene({ id: "s1", onScreenText: "something" })]);
    const after = updateSceneField(before, "s1", "onScreenText", "");
    expect(after.scenes[0].onScreenText).toBe("");
  });

  it("is a no-op when the scene id doesn't match any scene", () => {
    const before = plan([scene({ id: "s1" })]);
    const after = updateSceneField(before, "does-not-exist", "narration", "x");
    expect(after.scenes).toEqual(before.scenes);
  });
});
