import { describe, expect, it } from "vitest";
import { buildPlanAudioProps } from "@/lib/audio/plan-audio";
import { adaptSceneDurationsForNarration, computeSceneAudioTimings } from "@/lib/audio/scene-audio-sync";
import { secondsToFrames } from "@/lib/ai/scene-timing";
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
      scene({ id: "s2", startTime: 4, duration: 4, narration: null }),
      scene({ id: "s3", startTime: 8, duration: 4, purpose: "cta-scene" }),
    ],
    ...overrides,
  };
}

describe("buildPlanAudioProps", () => {
  it("audio disabled behavior: with no narration URLs supplied, there are no voice tracks and no ducking intervals", () => {
    const audio = buildPlanAudioProps(plan(), {}, 30);
    expect(audio.voiceTracks).toEqual([]);
    expect(audio.narrationIntervals).toEqual([]);
  });

  it("audio disabled behavior: music is null when the catalog has no licensed asset for the selected style (today, always)", () => {
    const audio = buildPlanAudioProps(plan(), {}, 30);
    expect(audio.music).toBeNull();
  });

  it("music is null when musicEnabled is explicitly false, even if narration URLs are supplied", () => {
    const p = plan({ audio: { voiceGender: "female", voiceStyle: "warm", narrationPace: "normal", musicEnabled: false, musicStyle: "calm" } });
    const audio = buildPlanAudioProps(p, { s1: "data:audio/mpeg;base64,AAA" }, 30);
    expect(audio.music).toBeNull();
  });

  it("creates exactly one voice track per scene that has both narration and a supplied URL", () => {
    const audio = buildPlanAudioProps(plan(), { s1: "url-1", s3: "url-3" }, 30);
    expect(audio.voiceTracks).toHaveLength(2);
    expect(audio.voiceTracks.map((t) => t.src).sort()).toEqual(["url-1", "url-3"]);
  });

  it("never creates a voice track for a scene with no narration, even if a URL is (incorrectly) supplied for it", () => {
    // s2 has narration: null in the fixture above.
    const audio = buildPlanAudioProps(plan(), { s2: "url-2" }, 30);
    expect(audio.voiceTracks).toEqual([]);
  });

  it("never duplicates narration: at most one voice track exists per scene id", () => {
    const audio = buildPlanAudioProps(plan(), { s1: "url-1", s3: "url-3" }, 30);
    const startFrames = audio.voiceTracks.map((t) => t.startFrame);
    expect(new Set(startFrames).size).toBe(startFrames.length);
  });

  it("last-scene audio ending: a voice track's start + duration never exceeds the composition's total frames", () => {
    const p = adaptSceneDurationsForNarration(
      plan({ scenes: [scene({ id: "s1", duration: 4 }), scene({ id: "s2", duration: 1, narration: "word ".repeat(60).trim(), purpose: "cta-scene" })] }),
    );
    const audio = buildPlanAudioProps(p, { s2: "url-2" }, 30);
    const totalFrames = Math.round(p.scenes.reduce((sum, s) => sum + s.duration, 0) * 30);
    const track = audio.voiceTracks[0];
    expect(track.startFrame + track.durationFrames).toBeLessThanOrEqual(totalFrames);
  });

  it("ducking only activates for scenes that actually have real narration audio, not merely narration text", () => {
    // Only s1 gets a URL; s3 also has narration text but no URL.
    const audio = buildPlanAudioProps(plan(), { s1: "url-1" }, 30);
    expect(audio.narrationIntervals).toHaveLength(1);
  });

  it("leaves trim fields unset for an ordinary (non-continuous) voice track — plays the whole clip from its own start, exactly like before trims existed", () => {
    const audio = buildPlanAudioProps(plan(), { s1: "url-1" }, 30);
    expect(audio.voiceTracks[0].trimStartFrames).toBeUndefined();
    expect(audio.voiceTracks[0].trimEndFrames).toBeUndefined();
  });

  it("converts a continuous-narration scene's trimStartSeconds/trimEndSeconds into frames on its voice track", () => {
    const audio = buildPlanAudioProps(plan(), { s1: "shared-url" }, 30, {
      s1: { trimStartSeconds: 0, trimEndSeconds: 1.5 },
    });
    expect(audio.voiceTracks[0].trimStartFrames).toBe(0);
    expect(audio.voiceTracks[0].trimEndFrames).toBe(45); // 1.5s * 30fps
  });

  it("(continuous narration export regression) each scene reads its OWN distinct trim window from the shared continuous file — never restarts to the same offset as another scene", () => {
    // The real shape of continuous narration: every scene's narrationAudioUrls entry points at the SAME shared file (see lib/audio/plan-narration.ts's synthesizePlanNarrationContinuous), distinguished only by narrationTrims. A bug that dropped/ignored trims would make every voice track start reading from the same point in the file — audibly "restarting" the narration at every scene.
    const sharedUrl = "https://storage.example/shared-continuous.mp3";
    const p = plan({
      scenes: [
        scene({ id: "s1", startTime: 0, duration: 4 }),
        scene({ id: "s2", startTime: 4, duration: 4, narration: "second line" }),
        scene({ id: "s3", startTime: 8, duration: 4, purpose: "cta-scene", narration: "third line" }),
      ],
    });
    const audio = buildPlanAudioProps(p, { s1: sharedUrl, s2: sharedUrl, s3: sharedUrl }, 30, {
      s1: { trimStartSeconds: 0, trimEndSeconds: 1.2 },
      s2: { trimStartSeconds: 1.5, trimEndSeconds: 3.0 },
      s3: { trimStartSeconds: 3.4, trimEndSeconds: 5.1 },
    });

    expect(audio.voiceTracks).toHaveLength(3);
    expect(audio.voiceTracks.every((t) => t.src === sharedUrl)).toBe(true);

    const byStart = [...audio.voiceTracks].sort((a, b) => a.startFrame - b.startFrame);
    const trimStarts = byStart.map((t) => t.trimStartFrames);
    expect(new Set(trimStarts).size).toBe(trimStarts.length);
    for (let i = 1; i < byStart.length; i++) {
      expect(byStart[i].trimStartFrames!).toBeGreaterThan(byStart[i - 1].trimStartFrames!);
    }
  });

  it("is deterministic for the same plan and URL map", () => {
    const p = plan();
    const urls = { s1: "url-1", s3: "url-3" };
    expect(buildPlanAudioProps(p, urls, 30)).toEqual(buildPlanAudioProps(p, urls, 30));
  });

  it("(chopping-bug regression) voice track duration comes from the real trim duration, not the smaller pre-synthesis estimate, when a trim exists", () => {
    // "hi" estimates to well under a second; the real ElevenLabs-measured clip is 3s.
    const trims = { s1: { trimStartSeconds: 0, trimEndSeconds: 3 } };
    const before = plan({ scenes: [scene({ id: "s1", duration: 1, narration: "hi" })] });
    const adapted = adaptSceneDurationsForNarration(before, trims);

    const audio = buildPlanAudioProps(adapted, { s1: "shared-url" }, 30, trims);
    const track = audio.voiceTracks[0];

    expect(track.durationFrames).toBeGreaterThanOrEqual(secondsToFrames(3, 30));
  });

  it("(chopping-bug regression) no cutoff: the voice track's Sequence covers the entire real narration even when the estimate undershoots reality — mirrors the real production case (estimate 5.245s, real 5.944s)", () => {
    const trims = { s1: { trimStartSeconds: 0, trimEndSeconds: 5.944 } };
    const before = plan({
      language: "ar",
      scenes: [scene({ id: "s1", duration: 4, narration: "بتحتاج إعلان احترافي؟ دلوقتي تقدر تعمله في دقائق، من غير مصمم ومن غير تعقيد." })],
    });
    const adapted = adaptSceneDurationsForNarration(before, trims);

    const audio = buildPlanAudioProps(adapted, { s1: "shared-url" }, 30, trims);
    const track = audio.voiceTracks[0];

    expect(track.durationFrames).toBeGreaterThanOrEqual(secondsToFrames(5.944, 30));
    // endAt must still land exactly on the real trim end, in frames.
    expect(track.trimEndFrames).toBe(Math.round(5.944 * 30));
  });

  it("no regression: without any narrationTrims, voice track duration still comes from the pre-synthesis estimate exactly as before", () => {
    const p = plan();
    const timings = computeSceneAudioTimings(p);
    const s1Timing = timings.find((t) => t.sceneId === "s1")!;

    const audio = buildPlanAudioProps(p, { s1: "url-1" }, 30);
    const track = audio.voiceTracks.find((t) => t.src === "url-1")!;

    const expectedFrames = Math.max(1, Math.min(secondsToFrames(s1Timing.narrationDuration, 30), secondsToFrames(timings[timings.length - 1].end, 30) - track.startFrame));
    expect(track.durationFrames).toBe(expectedFrames);
  });
});
