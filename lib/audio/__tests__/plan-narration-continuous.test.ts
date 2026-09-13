import { describe, expect, it, vi } from "vitest";
import { synthesizePlanNarrationContinuous, buildNarrationTrims, EMPTY_NARRATION_RESULT, type SynthesizeContinuous, type UploadContinuousAudio } from "@/lib/audio/plan-narration";
import type { UploadNarrationAudioResult } from "@/lib/audio/narration-storage";
import type { ContinuousSynthesizeResult } from "@/lib/audio/providers/elevenlabs-continuous-provider";

/**
 * synthesizePlanNarrationContinuous takes injected `synthesizeContinuous`
 * and `uploadAudio` functions — like synthesizePlanNarration.test.ts, this
 * file never makes a real ElevenLabs or Supabase Storage call; production
 * wiring (with the automatic fallback to the per-scene pipeline) lives in
 * lib/actions/narration-actions.ts.
 */
function makePlan(scenes: { id: string; narration: string | null }[], language: "ar" | "en" = "en") {
  return {
    language,
    visualStyle: "fast" as const,
    audio: null,
    business: "Acme Co",
    videoTitle: "Acme Ad",
    durationSeconds: 20,
    scenes: scenes.map((s) => ({ ...s, transition: "fade" as const })),
  };
}

function fakeUploadSucceeds(): UploadContinuousAudio {
  return vi.fn(async (): Promise<UploadNarrationAudioResult> => ({
    ok: true,
    path: "u1/g1/__continuous__.mp3",
    signedUrl: "https://storage.example/signed/continuous",
    contentType: "audio/mpeg",
  }));
}

function fakeUploadFails(error = "storage unavailable"): UploadContinuousAudio {
  return vi.fn(async (): Promise<UploadNarrationAudioResult> => ({ ok: false, error }));
}

/** A fake continuous synthesis whose alignment gives every character an evenly-spaced, deterministic timestamp — good enough to prove segment slicing without a real ElevenLabs response. */
function fakeSynthesizeSucceeds(): SynthesizeContinuous {
  return vi.fn(async (fullText: string): Promise<ContinuousSynthesizeResult> => {
    const characters = fullText.split("");
    return {
      ok: true,
      audioUrl: "data:audio/mpeg;base64,fake",
      alignment: {
        characters,
        characterStartTimesSeconds: characters.map((_, i) => i * 0.05),
        characterEndTimesSeconds: characters.map((_, i) => i * 0.05 + 0.05),
      },
      characters: fullText.length,
      estimatedUsd: 0.01,
    };
  });
}

function fakeSynthesizeFails(error = "elevenlabs down"): SynthesizeContinuous {
  return vi.fn(async (): Promise<ContinuousSynthesizeResult> => ({ ok: false, error }));
}

describe("synthesizePlanNarrationContinuous", () => {
  it('returns EMPTY_NARRATION_RESULT ("none") without calling synthesizeContinuous or uploadAudio when no scene has narration', async () => {
    const plan = makePlan([{ id: "s1", narration: null }, { id: "s2", narration: "   " }]);
    const synthesizeContinuous = vi.fn();
    const uploadAudio = fakeUploadSucceeds();

    const result = await synthesizePlanNarrationContinuous(plan, synthesizeContinuous, uploadAudio);

    expect(result).toEqual(EMPTY_NARRATION_RESULT);
    expect(synthesizeContinuous).not.toHaveBeenCalled();
    expect(uploadAudio).not.toHaveBeenCalled();
  });

  it("calls the TTS provider exactly ONCE for the whole video regardless of scene count — the entire point of continuous synthesis", async () => {
    const plan = makePlan([
      { id: "s1", narration: "Hook line" },
      { id: "s2", narration: "Feature line" },
      { id: "s3", narration: "Call to action" },
    ]);
    const synthesizeContinuous = fakeSynthesizeSucceeds();
    const uploadAudio = fakeUploadSucceeds();

    await synthesizePlanNarrationContinuous(plan, synthesizeContinuous, uploadAudio);

    expect(synthesizeContinuous).toHaveBeenCalledTimes(1);
    expect(uploadAudio).toHaveBeenCalledTimes(1);
  });

  it("gives every narrated scene the SAME shared audio URL, distinguished by trim start/end", async () => {
    const plan = makePlan([
      { id: "s1", narration: "Hook line" },
      { id: "s2", narration: "Feature line" },
    ]);
    const result = await synthesizePlanNarrationContinuous(plan, fakeSynthesizeSucceeds(), fakeUploadSucceeds());

    expect(result.status).toBe("ok");
    expect(result.narrationAudioUrls.s1).toBe("https://storage.example/signed/continuous");
    expect(result.narrationAudioUrls.s2).toBe("https://storage.example/signed/continuous");
    expect(result.sceneAudio.s1.audioUrl).toBe(result.sceneAudio.s2.audioUrl);

    // Distinct, ordered, non-overlapping trims into that one shared file.
    const s1 = result.sceneAudio.s1;
    const s2 = result.sceneAudio.s2;
    expect(s1.trimStartSeconds).not.toBeNull();
    expect(s1.trimEndSeconds).not.toBeNull();
    expect(s1.trimEndSeconds!).toBeLessThanOrEqual(s2.trimStartSeconds!);
  });

  it("skips a scene with no narration when slicing (only narrated scenes appear in sceneAudio)", async () => {
    const plan = makePlan([
      { id: "s1", narration: "Hook line" },
      { id: "silent", narration: null },
      { id: "s3", narration: "Closing line" },
    ]);
    const result = await synthesizePlanNarrationContinuous(plan, fakeSynthesizeSucceeds(), fakeUploadSucceeds());

    expect(Object.keys(result.sceneAudio).sort()).toEqual(["s1", "s3"]);
  });

  it("throws when the provider reports failure — the caller (narration-actions.ts) is responsible for falling back to the per-scene pipeline", async () => {
    const plan = makePlan([{ id: "s1", narration: "Hook line" }]);
    await expect(synthesizePlanNarrationContinuous(plan, fakeSynthesizeFails(), fakeUploadSucceeds())).rejects.toThrow("elevenlabs down");
  });

  it("throws when the upload fails, never returning a half-successful result", async () => {
    const plan = makePlan([{ id: "s1", narration: "Hook line" }]);
    await expect(synthesizePlanNarrationContinuous(plan, fakeSynthesizeSucceeds(), fakeUploadFails())).rejects.toThrow("storage unavailable");
  });

  it("throws when the alignment produces no usable timing (malformed provider response) rather than silently rendering silence", async () => {
    const plan = makePlan([{ id: "s1", narration: "Hook line" }]);
    const synthesizeContinuous: SynthesizeContinuous = vi.fn(async (): Promise<ContinuousSynthesizeResult> => ({
      ok: true,
      audioUrl: "data:audio/mpeg;base64,fake",
      alignment: { characters: [], characterStartTimesSeconds: [], characterEndTimesSeconds: [] },
      characters: 0,
      estimatedUsd: null,
    }));
    await expect(synthesizePlanNarrationContinuous(plan, synthesizeContinuous, fakeUploadSucceeds())).rejects.toThrow();
  });

  it("preserves the exact narration text passed to the TTS call, in scene order, for correct fact/CTA accuracy", async () => {
    const plan = makePlan([
      { id: "s1", narration: "Try Acme now" },
      { id: "s2", narration: "Only 5000 IQD" },
    ]);
    const synthesizeContinuous = fakeSynthesizeSucceeds();
    await synthesizePlanNarrationContinuous(plan, synthesizeContinuous, fakeUploadSucceeds());

    const [fullText] = (synthesizeContinuous as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fullText).toContain("Try Acme now");
    expect(fullText).toContain("Only 5000 IQD");
    expect(fullText.indexOf("Try Acme now")).toBeLessThan(fullText.indexOf("Only 5000 IQD"));
  });
});

describe("buildNarrationTrims", () => {
  it("includes only scenes with both trim fields set", () => {
    const trims = buildNarrationTrims({
      s1: { audioUrl: "u", storagePath: "p", contentType: "audio/mpeg", durationSeconds: 1, provider: "elevenlabs", characters: 5, estimatedUsd: null, trimStartSeconds: 0, trimEndSeconds: 1.2 },
      s2: { audioUrl: "u2", storagePath: "p2", contentType: "audio/mpeg", durationSeconds: 1, provider: "elevenlabs", characters: 5, estimatedUsd: null },
    });
    expect(Object.keys(trims)).toEqual(["s1"]);
    expect(trims.s1).toEqual({ trimStartSeconds: 0, trimEndSeconds: 1.2 });
  });

  it("returns an empty object for a plan with no continuous-narration scenes at all (the ordinary per-scene case)", () => {
    const trims = buildNarrationTrims({
      s1: { audioUrl: "u", storagePath: "p", contentType: "audio/mpeg", durationSeconds: 1, provider: "elevenlabs", characters: 5, estimatedUsd: null },
    });
    expect(trims).toEqual({});
  });
});
