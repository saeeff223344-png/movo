import { describe, expect, it, vi } from "vitest";
import { synthesizePlanNarration, EMPTY_NARRATION_RESULT, type NarrationAudioUploader } from "@/lib/audio/plan-narration";
import type { UploadNarrationAudioResult } from "@/lib/audio/narration-storage";
import type { TtsRequest, TtsResult } from "@/lib/audio/types";

/**
 * synthesizePlanNarration takes injected `synthesize` and `uploadAudio`
 * functions rather than importing the real (both "server-only") TTS
 * provider chain or Supabase client directly, specifically so these tests
 * never touch "server-only" or make a real network/paid API call — no real
 * ElevenLabs or Supabase Storage call happens anywhere in this file.
 * lib/actions/narration-actions.ts wires the real implementations in for
 * production.
 */
function makePlan(overrides: {
  language: "ar" | "en";
  scenes: { id: string; narration: string | null }[];
}) {
  return {
    language: overrides.language,
    visualStyle: "fast" as const,
    audio: null,
    business: "Acme Co",
    videoTitle: "Acme Ad",
    durationSeconds: 20,
    scenes: overrides.scenes.map((s) => ({ ...s, transition: "fade" as const })),
  };
}

function realResult(provider: TtsResult["provider"], overrides: Partial<TtsResult> = {}): TtsResult {
  return {
    audioUrl: `data:audio/mpeg;base64,${provider}`,
    durationSeconds: 3,
    provider,
    cost: { characters: 10, estimatedUsd: 0.002 },
    ...overrides,
  };
}

const SILENT_RESULT: TtsResult = { audioUrl: null, durationSeconds: 3, provider: "silent-fallback", cost: { characters: 10, estimatedUsd: null } };

/** Fake Storage uploader — "succeeds" by turning a scene id into a distinguishable fake signed URL/path, without ever touching a real Supabase client. */
function fakeUploadSucceeds(): NarrationAudioUploader {
  return vi.fn(async (sceneId: string): Promise<UploadNarrationAudioResult> => ({
    ok: true,
    path: `u1/g1/${sceneId}.mp3`,
    signedUrl: `https://storage.example/signed/${sceneId}`,
    contentType: "audio/mpeg",
  }));
}

function fakeUploadFails(error = "storage unavailable"): NarrationAudioUploader {
  return vi.fn(async (): Promise<UploadNarrationAudioResult> => ({ ok: false, error }));
}

describe("synthesizePlanNarration", () => {
  it('returns EMPTY_NARRATION_RESULT ("none") without calling synthesize or uploadAudio when no scene has narration', async () => {
    const plan = makePlan({ language: "en", scenes: [{ id: "s1", narration: null }, { id: "s2", narration: "   " }] });
    const synthesize = vi.fn();
    const uploadAudio = fakeUploadSucceeds();

    const result = await synthesizePlanNarration(plan, synthesize, uploadAudio);

    expect(result).toEqual(EMPTY_NARRATION_RESULT);
    expect(synthesize).not.toHaveBeenCalled();
    expect(uploadAudio).not.toHaveBeenCalled();
  });

  it("(a) requests Arabic narration in the plan's own language for the Haytham/ElevenLabs path — the dialect is the planner's job, not this function's", async () => {
    const plan = makePlan({ language: "ar", scenes: [{ id: "s1", narration: "مع موفو، فكرتك بتتحول لفيديو" }] });
    const synthesize = vi.fn(async () => realResult("elevenlabs"));
    const uploadAudio = fakeUploadSucceeds();

    const result = await synthesizePlanNarration(plan, synthesize, uploadAudio);

    expect(synthesize).toHaveBeenCalledWith(
      expect.objectContaining<Partial<TtsRequest>>({ text: "مع موفو، فكرتك بتتحول لفيديو", language: "ar" }),
    );
    expect(result.status).toBe("ok");
    expect(result.narrationAudioUrls.s1).toBe("https://storage.example/signed/s1");
    expect(result.sceneAudio.s1.provider).toBe("elevenlabs");
  });

  it("(c) English works exactly the same way as Arabic — same request shape, same success path", async () => {
    const plan = makePlan({ language: "en", scenes: [{ id: "s1", narration: "Got an idea? MOVO turns it into video." }] });
    const synthesize = vi.fn(async () => realResult("openai"));
    const uploadAudio = fakeUploadSucceeds();

    const result = await synthesizePlanNarration(plan, synthesize, uploadAudio);

    expect(synthesize).toHaveBeenCalledWith(expect.objectContaining<Partial<TtsRequest>>({ language: "en" }));
    expect(result.status).toBe("ok");
    expect(result.narrationAudioUrls.s1).toBe("https://storage.example/signed/s1");
  });

  it("(base64 removed) never puts the provider's raw data: URL into narrationAudioUrls or sceneAudio once storage succeeds", async () => {
    const plan = makePlan({ language: "ar", scenes: [{ id: "s1", narration: "one" }] });
    const synthesize = vi.fn(async () => realResult("elevenlabs", { audioUrl: "data:audio/mpeg;base64,VERYLONGBASE64PAYLOAD" }));
    const uploadAudio = fakeUploadSucceeds();

    const result = await synthesizePlanNarration(plan, synthesize, uploadAudio);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("data:audio");
    expect(serialized).not.toContain("VERYLONGBASE64PAYLOAD");
    expect(result.narrationAudioUrls.s1).toBe("https://storage.example/signed/s1");
    expect(result.sceneAudio.s1.audioUrl).toBe("https://storage.example/signed/s1");
    expect(result.sceneAudio.s1.storagePath).toBe("u1/g1/s1.mp3");
    expect(result.sceneAudio.s1.contentType).toBe("audio/mpeg");
  });

  it("uploads only scenes that actually got real audio — never for a silent-fallback scene", async () => {
    const plan = makePlan({
      language: "ar",
      scenes: [
        { id: "s1", narration: "real" },
        { id: "s2", narration: "silent" },
      ],
    });
    const synthesize = vi
      .fn<(request: TtsRequest) => Promise<TtsResult>>()
      .mockResolvedValueOnce(realResult("elevenlabs"))
      .mockResolvedValueOnce(SILENT_RESULT);
    const uploadAudio = fakeUploadSucceeds();

    await synthesizePlanNarration(plan, synthesize, uploadAudio);

    expect(uploadAudio).toHaveBeenCalledTimes(1);
    expect(uploadAudio).toHaveBeenCalledWith("s1", expect.stringContaining("data:audio/mpeg;base64,"));
  });

  it('(storage failure preserves the plan) a scene whose Storage upload fails gets no audio, degrading status instead of throwing', async () => {
    const plan = makePlan({
      language: "ar",
      scenes: [
        { id: "s1", narration: "one" },
        { id: "s2", narration: "two" },
      ],
    });
    const synthesize = vi.fn(async () => realResult("elevenlabs"));
    const uploadAudio = vi
      .fn<NarrationAudioUploader>()
      .mockResolvedValueOnce({ ok: true, path: "u1/g1/s1.mp3", signedUrl: "https://storage.example/signed/s1", contentType: "audio/mpeg" })
      .mockResolvedValueOnce({ ok: false, error: "bucket quota exceeded" });

    const result = await synthesizePlanNarration(plan, synthesize, uploadAudio);

    expect(result.status).toBe("partial");
    expect(Object.keys(result.narrationAudioUrls)).toEqual(["s1"]);
    expect(result.sceneAudio.s2.audioUrl).toBeNull();
    expect(result.sceneAudio.s2.storagePath).toBeNull();
    // The TTS call still succeeded and is still billed/counted even though storage failed:
    expect(result.sceneAudio.s2.provider).toBe("elevenlabs");
    expect(result.cost.characters).toBe(20);
  });

  it('reports "failed" (never throws) when Storage is entirely unavailable for every narrated scene', async () => {
    const plan = makePlan({ language: "ar", scenes: [{ id: "s1", narration: "one" }] });
    const synthesize = vi.fn(async () => realResult("elevenlabs"));
    const uploadAudio = fakeUploadFails("network error contacting storage");

    const result = await synthesizePlanNarration(plan, synthesize, uploadAudio);

    expect(result.status).toBe("failed");
    expect(result.narrationAudioUrls).toEqual({});
    expect(result.sceneAudio.s1.audioUrl).toBeNull();
  });

  it('(d) reports "partial" when some scenes get real audio and others fall back to silence', async () => {
    const plan = makePlan({
      language: "ar",
      scenes: [
        { id: "s1", narration: "one" },
        { id: "s2", narration: "two" },
      ],
    });
    const synthesize = vi
      .fn<(request: TtsRequest) => Promise<TtsResult>>()
      .mockResolvedValueOnce(realResult("elevenlabs"))
      .mockResolvedValueOnce(SILENT_RESULT);
    const uploadAudio = fakeUploadSucceeds();

    const result = await synthesizePlanNarration(plan, synthesize, uploadAudio);

    expect(result.status).toBe("partial");
    expect(Object.keys(result.narrationAudioUrls)).toEqual(["s1"]);
    expect(result.sceneAudio.s2).toEqual({
      audioUrl: null,
      storagePath: null,
      contentType: null,
      durationSeconds: 3,
      provider: "silent-fallback",
      characters: 10,
      estimatedUsd: null,
    });
  });

  it('(d) reports "failed" when every narrated scene falls back to silence, but still returns a usable result instead of throwing', async () => {
    const plan = makePlan({ language: "ar", scenes: [{ id: "s1", narration: "one" }] });
    const synthesize = vi.fn(async () => SILENT_RESULT);
    const uploadAudio = fakeUploadSucceeds();

    const result = await synthesizePlanNarration(plan, synthesize, uploadAudio);

    expect(result.status).toBe("failed");
    expect(result.narrationAudioUrls).toEqual({});
    expect(uploadAudio).not.toHaveBeenCalled();
  });

  it("(d) a scene whose synthesize() call rejects is treated as a silent fallback, not a thrown error — the plan survives", async () => {
    const plan = makePlan({ language: "ar", scenes: [{ id: "s1", narration: "one" }] });
    const synthesize = vi.fn(async () => {
      throw new Error("network down");
    });
    const uploadAudio = fakeUploadSucceeds();

    const result = await synthesizePlanNarration(plan, synthesize, uploadAudio);

    expect(result.status).toBe("failed");
    expect(result.sceneAudio.s1).toEqual({
      audioUrl: null,
      storagePath: null,
      contentType: null,
      durationSeconds: 0,
      provider: "silent-fallback",
      characters: 0,
      estimatedUsd: null,
    });
  });

  it("(g) sums character counts and known costs across scenes, ignoring unknown (silent-fallback) costs", async () => {
    const plan = makePlan({
      language: "ar",
      scenes: [
        { id: "s1", narration: "one" },
        { id: "s2", narration: "two" },
      ],
    });
    const synthesize = vi
      .fn<(request: TtsRequest) => Promise<TtsResult>>()
      .mockResolvedValueOnce(realResult("elevenlabs", { cost: { characters: 100, estimatedUsd: 0.02 } }))
      .mockResolvedValueOnce(SILENT_RESULT);
    const uploadAudio = fakeUploadSucceeds();

    const result = await synthesizePlanNarration(plan, synthesize, uploadAudio);

    expect(result.cost.characters).toBe(110);
    expect(result.cost.estimatedUsd).toBeCloseTo(0.02, 6);
  });

  it("returns a null estimatedUsd when nothing has a known cost", async () => {
    const plan = makePlan({ language: "ar", scenes: [{ id: "s1", narration: "one" }] });
    const synthesize = vi.fn(async () => SILENT_RESULT);
    const uploadAudio = fakeUploadSucceeds();

    const result = await synthesizePlanNarration(plan, synthesize, uploadAudio);

    expect(result.cost.estimatedUsd).toBeNull();
  });

  describe("concurrency (never launches uncontrolled parallel ElevenLabs requests)", () => {
    it("synthesizes scenes one at a time, never starting the next before the previous resolves", async () => {
      const plan = makePlan({
        language: "ar",
        scenes: [
          { id: "s1", narration: "one" },
          { id: "s2", narration: "two" },
          { id: "s3", narration: "three" },
        ],
      });

      let inFlight = 0;
      let maxInFlight = 0;
      const synthesize = vi.fn(async (request: TtsRequest) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        // Yield a tick so a buggy Promise.all-style fan-out would overlap calls here.
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return realResult("elevenlabs", { cost: { characters: request.text.length, estimatedUsd: 0.001 } });
      });
      const uploadAudio = fakeUploadSucceeds();

      await synthesizePlanNarration(plan, synthesize, uploadAudio);

      expect(maxInFlight).toBe(1);
      expect(synthesize).toHaveBeenCalledTimes(3);
    });

    it("calls synthesize for each scene in the plan's own scene order", async () => {
      const plan = makePlan({
        language: "ar",
        scenes: [
          { id: "s1", narration: "first" },
          { id: "s2", narration: "second" },
          { id: "s3", narration: "third" },
        ],
      });

      const calledWithText: string[] = [];
      const synthesize = vi.fn(async (request: TtsRequest) => {
        calledWithText.push(request.text);
        return realResult("elevenlabs");
      });
      const uploadAudio = fakeUploadSucceeds();

      await synthesizePlanNarration(plan, synthesize, uploadAudio);

      expect(calledWithText).toEqual(["first", "second", "third"]);
    });

    it("(scene/audio ordering) maps every generated clip back to its own scene id, even when providers/results differ per scene", async () => {
      const plan = makePlan({
        language: "ar",
        scenes: [
          { id: "hook", narration: "hook line" },
          { id: "reveal", narration: "reveal line" },
          { id: "cta", narration: "cta line" },
        ],
      });

      const synthesize = vi
        .fn<(request: TtsRequest) => Promise<TtsResult>>()
        .mockResolvedValueOnce(realResult("elevenlabs", { audioUrl: "data:audio/mpeg;base64,HOOK" }))
        .mockResolvedValueOnce(SILENT_RESULT)
        .mockResolvedValueOnce(realResult("elevenlabs", { audioUrl: "data:audio/mpeg;base64,CTA" }));
      const uploadAudio = fakeUploadSucceeds();

      const result = await synthesizePlanNarration(plan, synthesize, uploadAudio);

      expect(result.narrationAudioUrls).toEqual({
        hook: "https://storage.example/signed/hook",
        cta: "https://storage.example/signed/cta",
      });
      expect(result.sceneAudio.reveal.audioUrl).toBeNull();
      expect(result.status).toBe("partial");
    });
  });
});
