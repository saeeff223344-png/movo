import { describe, expect, it } from "vitest";
import { videoPlanSchema, audioSettingsSchema } from "@/lib/ai/video-plan-schema";

function validScene(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "scene-1",
    startTime: 0,
    duration: 3,
    purpose: "hook",
    narration: "جوعان؟ عندنا الحل.",
    onScreenText: null,
    visualDirection: "Close-up of a fresh burger on a dark background.",
    motionDirection: "Slow push-in, subtle steam animation.",
    transition: "cut",
    assetNeeds: ["product photo"],
    textPosition: "center",
    textAlign: "center",
    visual: null,
    ...overrides,
  };
}

function validAudio(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    voiceGender: "female",
    voiceStyle: "energetic",
    narrationPace: "normal",
    musicEnabled: true,
    musicStyle: "upbeat",
    ...overrides,
  };
}

function validPlan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    language: "ar",
    videoTitle: "إعلان برجر هاوس",
    business: "Burger House",
    objective: "Drive orders for the two-meal deal",
    targetAudience: "Young adults in Baghdad who order food delivery",
    platform: "reels",
    aspectRatio: "9:16",
    durationSeconds: 6,
    visualStyle: "fast",
    tone: "ودود وسريع",
    brandColors: null,
    palette: null,
    visualTheme: null,
    cta: "اطلب الآن",
    scenes: [
      validScene(),
      validScene({ id: "scene-2", startTime: 3, duration: 2, purpose: "product-reveal" }),
      validScene({ id: "scene-3", startTime: 5, duration: 1, purpose: "cta-scene" }),
    ],
    audio: null,
    ...overrides,
  };
}

describe("videoPlanSchema", () => {
  it("accepts a complete, well-formed plan", () => {
    const result = videoPlanSchema.safeParse(validPlan());
    expect(result.success).toBe(true);
  });

  it("accepts null for every nullable field", () => {
    const nullableScene = validScene({ narration: null, onScreenText: null, textPosition: null, textAlign: null });
    const plan = validPlan({ brandColors: null, scenes: [nullableScene, nullableScene, nullableScene] });
    const result = videoPlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  it("rejects an unknown platform value", () => {
    const result = videoPlanSchema.safeParse(validPlan({ platform: "facebook" }));
    expect(result.success).toBe(false);
  });

  it("rejects an unknown scene purpose", () => {
    const plan = validPlan({ scenes: [validScene({ purpose: "explosion" })] });
    const result = videoPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it("rejects a plan with fewer than the minimum number of scenes", () => {
    const result = videoPlanSchema.safeParse(validPlan({ scenes: [validScene()] }));
    expect(result.success).toBe(false);
  });

  it("rejects a brand color that isn't a hex code", () => {
    const result = videoPlanSchema.safeParse(validPlan({ brandColors: ["red"] }));
    expect(result.success).toBe(false);
  });

  it("accepts valid hex brand colors", () => {
    const result = videoPlanSchema.safeParse(validPlan({ brandColors: ["#FF5733", "#000000"] }));
    expect(result.success).toBe(true);
  });

  it("accepts a fully-specified deliberate palette", () => {
    const result = videoPlanSchema.safeParse(
      validPlan({ palette: { background: "#2b1a0f", backgroundEnd: "#5c2e12", accent: "#e8641c", secondaryAccent: "#f0a34d", text: "#fff6ec" } }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a palette with a non-hex color", () => {
    const result = videoPlanSchema.safeParse(
      validPlan({ palette: { background: "orange", backgroundEnd: "#5c2e12", accent: "#e8641c", secondaryAccent: "#f0a34d", text: "#fff6ec" } }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a palette missing a required field", () => {
    const result = videoPlanSchema.safeParse(
      validPlan({ palette: { background: "#2b1a0f", accent: "#e8641c", secondaryAccent: "#f0a34d", text: "#fff6ec" } }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts a fully-specified scene visual plan", () => {
    const result = videoPlanSchema.safeParse(
      validPlan({
        scenes: [
          validScene({ visual: { subject: "fresh espresso pouring into a ceramic cup", role: "hero", usage: "full_bleed_background", preferUserAsset: false, cropFocus: "subject", importance: "primary" } }),
          validScene({ id: "scene-2", startTime: 3, duration: 2, purpose: "product-reveal" }),
          validScene({ id: "scene-3", startTime: 5, duration: 1, purpose: "cta-scene" }),
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a scene visual plan with every field null (role: none)", () => {
    const result = videoPlanSchema.safeParse(
      validPlan({ scenes: [validScene({ visual: { subject: null, role: "none", usage: "none", preferUserAsset: null, cropFocus: null, importance: null } }), validScene({ id: "scene-2", startTime: 3, duration: 2 }), validScene({ id: "scene-3", startTime: 5, duration: 1, purpose: "cta-scene" })] }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a scene visual plan with an unknown role", () => {
    const result = videoPlanSchema.safeParse(
      validPlan({ scenes: [validScene({ visual: { subject: "x", role: "villain", usage: "none", preferUserAsset: null, cropFocus: null, importance: null } })] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a scene visual plan missing a required field", () => {
    const result = videoPlanSchema.safeParse(
      validPlan({ scenes: [validScene({ visual: { subject: "x", role: "hero", usage: "full_bleed_background" } })] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a scene missing the visual key entirely (must be present, even as null)", () => {
    const scene = validScene();
    delete (scene as Record<string, unknown>).visual;
    const result = videoPlanSchema.safeParse(validPlan({ scenes: [scene] }));
    expect(result.success).toBe(false);
  });

  it("accepts a fully-specified visualTheme", () => {
    const result = videoPlanSchema.safeParse(
      validPlan({ visualTheme: { photographyStyle: "warm editorial food photography", lighting: "soft golden-hour window light", colorTemperature: "warm" } }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a visualTheme missing a required field", () => {
    const result = videoPlanSchema.safeParse(validPlan({ visualTheme: { photographyStyle: "x", lighting: "y" } }));
    expect(result.success).toBe(false);
  });

  it("rejects a plan missing the visualTheme key entirely (must be present, even as null)", () => {
    const plan = validPlan();
    delete (plan as Record<string, unknown>).visualTheme;
    const result = videoPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const plan = validPlan();
    delete (plan as Record<string, unknown>).cta;
    const result = videoPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it("accepts audio: null (backward compatible with a plan that has no audio opinion)", () => {
    const result = videoPlanSchema.safeParse(validPlan({ audio: null }));
    expect(result.success).toBe(true);
  });

  it("accepts a fully specified audio object", () => {
    const result = videoPlanSchema.safeParse(validPlan({ audio: validAudio() }));
    expect(result.success).toBe(true);
  });

  it("rejects an audio object missing a field (audio must be a deliberate, complete choice)", () => {
    const audio = validAudio();
    delete (audio as Record<string, unknown>).musicStyle;
    const result = videoPlanSchema.safeParse(validPlan({ audio }));
    expect(result.success).toBe(false);
  });

  it("rejects an unknown voiceGender", () => {
    const result = videoPlanSchema.safeParse(validPlan({ audio: validAudio({ voiceGender: "robot" }) }));
    expect(result.success).toBe(false);
  });

  it("rejects an unknown musicStyle", () => {
    const result = videoPlanSchema.safeParse(validPlan({ audio: validAudio({ musicStyle: "jazz" }) }));
    expect(result.success).toBe(false);
  });

  it("rejects audio: undefined (the key must be present, even if null)", () => {
    const plan = validPlan();
    delete (plan as Record<string, unknown>).audio;
    const result = videoPlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });
});

describe("audioSettingsSchema", () => {
  it("accepts every voice style, narration pace, and music style value", () => {
    for (const voiceStyle of ["warm", "energetic", "calm", "authoritative", "playful", "luxury"]) {
      expect(audioSettingsSchema.safeParse(validAudio({ voiceStyle })).success).toBe(true);
    }
    for (const narrationPace of ["slow", "normal", "fast"]) {
      expect(audioSettingsSchema.safeParse(validAudio({ narrationPace })).success).toBe(true);
    }
    for (const musicStyle of ["energetic", "cinematic", "luxury", "modern", "minimal", "upbeat", "technology", "emotional", "calm"]) {
      expect(audioSettingsSchema.safeParse(validAudio({ musicStyle })).success).toBe(true);
    }
  });
});
