import { describe, expect, it, vi } from "vitest";
import { resolveAutoVisuals } from "@/lib/visuals/visual-planning";
import type { PlannedScene } from "@/lib/ai/video-plan-schema";
import type { GenerateImageResult, UploadVisualAssetOutcome, VisualPlanningPlan } from "@/lib/visuals/types";

function plan(scenes: PlannedScene[], overrides: Partial<VisualPlanningPlan> = {}): VisualPlanningPlan {
  return {
    business: "Aroma Café",
    objective: "Drive foot traffic",
    targetAudience: "Coffee lovers",
    tone: "warm",
    cta: "Visit today",
    visualStyle: "luxury",
    language: "ar",
    aspectRatio: "9:16",
    visualTheme: null,
    scenes,
    ...overrides,
  };
}

function scene(id: string, overrides: Partial<PlannedScene> = {}): PlannedScene {
  return {
    id,
    startTime: 0,
    duration: 3,
    purpose: "hook",
    narration: null,
    onScreenText: null,
    visualDirection: `visual direction for ${id}`,
    motionDirection: "slow push-in",
    transition: "fade",
    assetNeeds: [],
    textPosition: "center",
    textAlign: "center",
    visual: null,
    ...overrides,
  };
}

function hero(id: string, subject: string, importance: "primary" | "secondary" | "minimal" = "primary"): PlannedScene {
  return scene(id, { visual: { subject, role: "hero", usage: "full_bleed_background", preferUserAsset: null, cropFocus: null, importance } });
}

const NO_USER_ASSETS = () => false;

function fakeGenerateSucceeds() {
  let n = 0;
  const fn = vi.fn(async (_input: { prompt: string; width: number; height: number }): Promise<GenerateImageResult> => {
    n += 1;
    return { ok: true, dataUrl: `data:image/png;base64,fake${n}`, provider: "openai:gpt-image-1", estimatedUsd: 0.07 };
  });
  return { fn, calls: () => n };
}

function fakeUploadSucceeds() {
  return vi.fn(async (sceneId: string): Promise<UploadVisualAssetOutcome> => ({
    ok: true,
    path: `user/gen/visuals/${sceneId}.png`,
    signedUrl: `https://storage.example/signed/${sceneId}`,
  }));
}

describe("resolveAutoVisuals", () => {
  it("returns {} without calling the provider when no scene needs a visual", async () => {
    const p = plan([scene("s1", { visual: { subject: null, role: "none", usage: "none", preferUserAsset: null, cropFocus: null, importance: null } })]);
    const { fn: generateImage } = fakeGenerateSucceeds();
    const uploadImage = fakeUploadSucceeds();

    const result = await resolveAutoVisuals(p, NO_USER_ASSETS, generateImage, uploadImage);

    expect(result).toEqual({});
    expect(generateImage).not.toHaveBeenCalled();
  });

  it("(Requirement 3: asset priority) never generates a visual for a scene a user asset already covers", async () => {
    const p = plan([hero("s1", "espresso pour")]);
    const { fn: generateImage } = fakeGenerateSucceeds();
    const uploadImage = fakeUploadSucceeds();

    const result = await resolveAutoVisuals(p, () => true, generateImage, uploadImage);

    expect(result).toEqual({});
    expect(generateImage).not.toHaveBeenCalled();
  });

  it("generates and uploads a visual for a scene that needs one and has no user asset", async () => {
    const p = plan([hero("s1", "espresso pour")]);
    const { fn: generateImage } = fakeGenerateSucceeds();
    const uploadImage = fakeUploadSucceeds();

    const result = await resolveAutoVisuals(p, NO_USER_ASSETS, generateImage, uploadImage);

    expect(result.s1).toMatchObject({ sceneId: "s1", url: "https://storage.example/signed/s1", source: "auto-generated", storagePath: "user/gen/visuals/s1.png" });
    expect(generateImage).toHaveBeenCalledTimes(1);
    expect(uploadImage).toHaveBeenCalledTimes(1);
  });

  it("(legacy fallback) treats a scene with no `visual` opinion at all as eligible", async () => {
    const p = plan([scene("s1")]); // visual: null
    const { fn: generateImage } = fakeGenerateSucceeds();
    const result = await resolveAutoVisuals(p, NO_USER_ASSETS, generateImage, fakeUploadSucceeds());
    expect(generateImage).toHaveBeenCalledTimes(1);
    expect(result.s1).toBeDefined();
  });

  it("(Requirement 12: dedup/reuse) two scenes with the same resolved prompt share ONE generated image, not two provider calls", async () => {
    const p = plan([hero("s1", "close-up roasted coffee beans"), hero("s2", "close-up roasted coffee beans")]);
    const { fn: generateImage, calls } = fakeGenerateSucceeds();
    const uploadImage = fakeUploadSucceeds();

    const result = await resolveAutoVisuals(p, NO_USER_ASSETS, generateImage, uploadImage);

    expect(calls()).toBe(1);
    expect(result.s1.url).toBe(result.s2.url);
  });

  it("(Requirement 12: cost cap) never exceeds maxVisuals real provider calls no matter how many scenes want one", async () => {
    const p = plan([hero("s1", "subject A"), hero("s2", "subject B"), hero("s3", "subject C"), hero("s4", "subject D")]);
    const { fn: generateImage, calls } = fakeGenerateSucceeds();

    const result = await resolveAutoVisuals(p, NO_USER_ASSETS, generateImage, fakeUploadSucceeds(), 2);

    expect(calls()).toBe(2);
    // every scene still gets *some* visual (reuse), never left with nothing purely due to the cap
    expect(Object.keys(result).sort()).toEqual(["s1", "s2", "s3", "s4"]);
  });

  it("(cost cap ranking) generates for the highest-importance scenes first", async () => {
    const p = plan([hero("low", "subject low", "minimal"), hero("high", "subject high", "primary")]);
    const generateImage = vi.fn(async (input: { prompt: string }): Promise<GenerateImageResult> => ({
      ok: true,
      dataUrl: `data:image/png;base64,${Buffer.from(input.prompt).toString("base64")}`,
      provider: "openai:gpt-image-1",
      estimatedUsd: 0.07,
    }));

    await resolveAutoVisuals(p, NO_USER_ASSETS, generateImage, fakeUploadSucceeds(), 1);

    expect(generateImage).toHaveBeenCalledTimes(1);
    expect((generateImage.mock.calls[0][0] as { prompt: string }).prompt).toContain("subject high");
  });

  it("(Requirement 11: provider failure fallback) skips a scene whose generation fails, without throwing", async () => {
    const p = plan([hero("s1", "subject A")]);
    const generateImage = vi.fn(async (_input: { prompt: string; width: number; height: number }): Promise<GenerateImageResult> => ({ ok: false, error: "rate limited" }));

    const result = await resolveAutoVisuals(p, NO_USER_ASSETS, generateImage, fakeUploadSucceeds());

    expect(result).toEqual({});
  });

  it("(Requirement 11: provider failure fallback) when the top-ranked group fails, remaining scenes still reuse whichever group DID succeed", async () => {
    const p = plan([hero("fails", "subject A", "primary"), hero("succeeds", "subject B", "secondary"), hero("reuser", "subject C", "minimal")]);
    let call = 0;
    const generateImage = vi.fn(async (_input: { prompt: string; width: number; height: number }): Promise<GenerateImageResult> => {
      call += 1;
      if (call === 1) return { ok: false, error: "boom" };
      return { ok: true, dataUrl: "data:image/png;base64,ok", provider: "openai:gpt-image-1", estimatedUsd: 0.07 };
    });

    const result = await resolveAutoVisuals(p, NO_USER_ASSETS, generateImage, fakeUploadSucceeds(), 2);

    expect(result.fails).toBeUndefined();
    expect(result.succeeds).toBeDefined();
    expect(result.reuser).toBeDefined();
  });

  it("resolves to {} (not a throw) when every generation attempt fails", async () => {
    const p = plan([hero("s1", "A"), hero("s2", "B")]);
    const generateImage = vi.fn(async (_input: { prompt: string; width: number; height: number }): Promise<GenerateImageResult> => ({ ok: false, error: "down" }));

    const result = await resolveAutoVisuals(p, NO_USER_ASSETS, generateImage, fakeUploadSucceeds());

    expect(result).toEqual({});
  });

  it("(Requirement 11) a failed upload also skips that scene, without throwing", async () => {
    const p = plan([hero("s1", "subject A")]);
    const { fn: generateImage } = fakeGenerateSucceeds();
    const uploadImage = vi.fn(async (): Promise<UploadVisualAssetOutcome> => ({ ok: false, error: "storage down" }));

    const result = await resolveAutoVisuals(p, NO_USER_ASSETS, generateImage, uploadImage);

    expect(result).toEqual({});
  });
});
