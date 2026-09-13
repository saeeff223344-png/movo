import { describe, expect, it } from "vitest";
import { computeSceneAudioTimings, adaptSceneDurationsForNarration } from "@/lib/audio/scene-audio-sync";
import type { VideoPlan } from "@/lib/ai/video-plan-schema";

function scene(overrides: Partial<VideoPlan["scenes"][number]> = {}): VideoPlan["scenes"][number] {
  return {
    id: "s1",
    startTime: 0,
    duration: 4,
    purpose: "hook",
    narration: "A short narration line",
    onScreenText: "Text",
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

function plan(overrides: Partial<VideoPlan> = {}): VideoPlan {
  return {
    language: "en",
    videoTitle: "Title",
    business: "Business",
    objective: "Objective",
    targetAudience: "Audience",
    platform: "reels",
    aspectRatio: "9:16",
    durationSeconds: 12,
    visualStyle: "tech",
    tone: "modern",
    brandColors: null,
    palette: null,
    visualTheme: null,
    cta: "Buy now",
    audio: null,
    scenes: [
      scene({ id: "s1", startTime: 0, duration: 4 }),
      scene({ id: "s2", startTime: 4, duration: 4 }),
      scene({ id: "s3", startTime: 8, duration: 4, purpose: "cta-scene" }),
    ],
    ...overrides,
  };
}

describe("computeSceneAudioTimings", () => {
  it("chains scenes with no gap or overlap: each scene's end equals the next scene's start", () => {
    const timings = computeSceneAudioTimings(plan());
    for (let i = 0; i < timings.length - 1; i++) {
      expect(timings[i].end).toBe(timings[i + 1].start);
    }
  });

  it("never lets narration overlap between scenes: every narration window stays inside its own scene's [start, end)", () => {
    const longPlan = plan({
      scenes: [
        scene({ id: "s1", duration: 1, narration: "word ".repeat(30).trim() }),
        scene({ id: "s2", duration: 1, narration: "word ".repeat(30).trim() }),
        scene({ id: "s3", duration: 1, narration: "word ".repeat(30).trim(), purpose: "cta-scene" }),
      ],
    });
    const timings = computeSceneAudioTimings(longPlan);
    for (const t of timings) {
      const narrationAbsoluteStart = t.start + t.narrationStart;
      const narrationAbsoluteEnd = t.start + t.narrationEnd;
      expect(narrationAbsoluteStart).toBeGreaterThanOrEqual(t.start);
      expect(narrationAbsoluteEnd).toBeLessThanOrEqual(t.end);
    }
    // And consecutive narration windows never intersect.
    for (let i = 0; i < timings.length - 1; i++) {
      expect(timings[i].start + timings[i].narrationEnd).toBeLessThanOrEqual(timings[i + 1].start);
    }
  });

  it("a scene with no narration has zero narration duration and pauseSeconds equal to its full duration", () => {
    const timings = computeSceneAudioTimings(plan({ scenes: [scene({ id: "s1", duration: 4, narration: null })] }));
    expect(timings[0].hasNarration).toBe(false);
    expect(timings[0].narrationDuration).toBe(0);
    expect(timings[0].pauseSeconds).toBe(4);
  });

  it("pauseSeconds is always non-negative", () => {
    const timings = computeSceneAudioTimings(plan());
    for (const t of timings) {
      expect(t.pauseSeconds).toBeGreaterThanOrEqual(0);
    }
  });

  it("is deterministic for the same plan", () => {
    const p = plan();
    expect(computeSceneAudioTimings(p)).toEqual(computeSceneAudioTimings(p));
  });

  it("plumbs the plan's own language through to the narration duration estimate (Arabic vs English)", () => {
    const text = "one two three four five six seven eight";
    const arabicText = "واحد اثنان ثلاثة أربعة خمسة ستة سبعة ثمانية";
    const englishTiming = computeSceneAudioTimings(plan({ language: "en", scenes: [scene({ id: "s1", duration: 10, narration: text })] }))[0];
    const arabicTiming = computeSceneAudioTimings(plan({ language: "ar", scenes: [scene({ id: "s1", duration: 10, narration: arabicText })] }))[0];
    expect(arabicTiming.narrationDuration).toBeGreaterThan(englishTiming.narrationDuration);
  });

  it("(chopping-bug regression) uses the real trim duration, not the pre-synthesis estimate, when a narrationTrim is supplied", () => {
    // "hi" estimates to well under a second; the real ElevenLabs-measured clip is 5s.
    const p = plan({ scenes: [scene({ id: "s1", duration: 1, narration: "hi" })] });
    const withoutTrim = computeSceneAudioTimings(p)[0];
    const withTrim = computeSceneAudioTimings(p, { s1: { trimStartSeconds: 0, trimEndSeconds: 5 } })[0];

    expect(withoutTrim.narrationDuration).toBeLessThan(1);
    expect(withTrim.narrationDuration).toBe(5);
  });

  it("(chopping-bug regression) falls back to the pre-synthesis estimate for a scene missing from narrationTrims — no regression when no real trim exists yet", () => {
    const p = plan();
    expect(computeSceneAudioTimings(p, {})).toEqual(computeSceneAudioTimings(p));
    // A trim for a different scene must not affect a scene that has none of its own.
    expect(computeSceneAudioTimings(p, { s2: { trimStartSeconds: 0, trimEndSeconds: 100 } })[0]).toEqual(computeSceneAudioTimings(p)[0]);
  });
});

describe("adaptSceneDurationsForNarration", () => {
  it("is a no-op when every scene's narration already comfortably fits (the common case)", () => {
    const before = plan();
    const after = adaptSceneDurationsForNarration(before);
    expect(after.scenes.map((s) => s.duration)).toEqual(before.scenes.map((s) => s.duration));
    expect(after.durationSeconds).toBe(before.durationSeconds);
  });

  it("widens a scene whose planned duration is too short for its own narration", () => {
    const before = plan({ scenes: [scene({ id: "s1", duration: 1, narration: "word ".repeat(60).trim() })] });
    const after = adaptSceneDurationsForNarration(before);
    expect(after.scenes[0].duration).toBeGreaterThan(before.scenes[0].duration);
  });

  it("does not allow narration to be cut off by a scene transition: adapted duration always fits narrationEnd plus trailing safety", () => {
    const before = plan({ scenes: [scene({ id: "s1", duration: 0.5, narration: "word ".repeat(40).trim() })] });
    const after = adaptSceneDurationsForNarration(before);
    const timing = computeSceneAudioTimings(after)[0];
    expect(timing.duration).toBeGreaterThanOrEqual(timing.narrationEnd);
    expect(timing.pauseSeconds).toBeGreaterThan(0);
  });

  it("also widens the very last scene when its narration needs more room (last-scene audio ending)", () => {
    const before = plan({
      scenes: [
        scene({ id: "s1", duration: 4 }),
        scene({ id: "s2", duration: 4 }),
        scene({ id: "s3", duration: 1, narration: "word ".repeat(60).trim(), purpose: "cta-scene" }),
      ],
    });
    const after = adaptSceneDurationsForNarration(before);
    expect(after.scenes[2].duration).toBeGreaterThan(1);
    // The recomputed total duration reflects the widened last scene, not the original sum.
    expect(after.durationSeconds).toBeCloseTo(after.scenes[0].duration + after.scenes[1].duration + after.scenes[2].duration, 5);
  });

  it("recomputes cumulative startTimes to match the (possibly widened) durations", () => {
    const before = plan({ scenes: [scene({ id: "s1", duration: 1, narration: "word ".repeat(60).trim() }), scene({ id: "s2", duration: 4, startTime: 1 })] });
    const after = adaptSceneDurationsForNarration(before);
    expect(after.scenes[1].startTime).toBeCloseTo(after.scenes[0].duration, 5);
  });

  it("is deterministic for the same plan", () => {
    const p = plan({ scenes: [scene({ id: "s1", duration: 1, narration: "word ".repeat(60).trim() })] });
    expect(adaptSceneDurationsForNarration(p)).toEqual(adaptSceneDurationsForNarration(p));
  });

  it("(chopping-bug regression) expands the scene using the real trim duration when it exceeds both the original scene duration and the pre-synthesis estimate", () => {
    // "hi" barely registers on the word-count estimate, but the real ElevenLabs clip is 6s —
    // exactly the scenario found in production (short estimate, much longer real narration).
    const before = plan({ scenes: [scene({ id: "s1", duration: 1, narration: "hi" })] });
    const trims = { s1: { trimStartSeconds: 0, trimEndSeconds: 6 } };

    const adaptedWithoutTrim = adaptSceneDurationsForNarration(before);
    const adaptedWithTrim = adaptSceneDurationsForNarration(before, trims);

    expect(adaptedWithoutTrim.scenes[0].duration).toBeLessThan(2);
    expect(adaptedWithTrim.scenes[0].duration).toBeGreaterThan(adaptedWithoutTrim.scenes[0].duration);
  });

  it("(chopping-bug regression) never lets the scene be shorter than the real narration slice, so the transition into the next scene can never cut it off", () => {
    const before = plan({ scenes: [scene({ id: "s1", duration: 1, narration: "hi" })] });
    const trims = { s1: { trimStartSeconds: 0, trimEndSeconds: 6 } };
    const after = adaptSceneDurationsForNarration(before, trims);
    const timing = computeSceneAudioTimings(after, trims)[0];

    expect(timing.duration).toBeGreaterThanOrEqual(6);
    // And the real narration window itself is fully inside the scene's own [start, end).
    expect(timing.start + timing.narrationEnd).toBeLessThanOrEqual(timing.end);
  });

  it("no regression: without any narrationTrims, adaptSceneDurationsForNarration behaves exactly as before", () => {
    const before = plan({ scenes: [scene({ id: "s1", duration: 1, narration: "word ".repeat(60).trim() })] });
    expect(adaptSceneDurationsForNarration(before, {})).toEqual(adaptSceneDurationsForNarration(before));
  });
});
