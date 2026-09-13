import { describe, expect, it } from "vitest";
import { buildSceneVisualPrompt, pickImageSize, visualPromptDedupeKey } from "@/lib/visuals/visual-prompt-builder";
import type { PlannedScene } from "@/lib/ai/video-plan-schema";
import type { VisualPlanningPlan } from "@/lib/visuals/types";

function plan(overrides: Partial<VisualPlanningPlan> = {}): VisualPlanningPlan {
  return {
    business: "Aroma Café",
    objective: "Drive foot traffic",
    targetAudience: "Coffee lovers in Baghdad",
    tone: "warm and inviting",
    cta: "Visit us today",
    visualStyle: "luxury",
    language: "ar",
    aspectRatio: "9:16",
    visualTheme: null,
    scenes: [],
    ...overrides,
  };
}

function scene(overrides: Partial<PlannedScene> = {}): PlannedScene {
  return {
    id: "s1",
    startTime: 0,
    duration: 3,
    purpose: "hook",
    narration: null,
    onScreenText: null,
    visualDirection: "espresso machine in a cozy café",
    motionDirection: "slow push-in",
    transition: "fade",
    assetNeeds: [],
    textPosition: "center",
    textAlign: "center",
    visual: null,
    ...overrides,
  };
}

describe("pickImageSize", () => {
  it("picks portrait for 9:16", () => expect(pickImageSize("9:16")).toBe("1024x1536"));
  it("picks landscape for 16:9", () => expect(pickImageSize("16:9")).toBe("1536x1024"));
  it("picks square for 1:1", () => expect(pickImageSize("1:1")).toBe("1024x1024"));
});

describe("buildSceneVisualPrompt", () => {
  it("uses the scene's visual.subject when present, over the free-text visualDirection", () => {
    const s = scene({ visual: { subject: "fresh espresso pouring into a ceramic cup", role: "hero", usage: "full_bleed_background", preferUserAsset: null, cropFocus: null, importance: "primary" } });
    const prompt = buildSceneVisualPrompt(plan(), s);
    expect(prompt).toContain("fresh espresso pouring into a ceramic cup");
    expect(prompt).not.toContain("espresso machine in a cozy café");
  });

  it("falls back to visualDirection when visual.subject is absent (legacy/older-shaped plan)", () => {
    const prompt = buildSceneVisualPrompt(plan(), scene());
    expect(prompt).toContain("espresso machine in a cozy café");
  });

  it("always includes the business, tone, and target audience for on-brief prompts", () => {
    const prompt = buildSceneVisualPrompt(plan(), scene());
    expect(prompt).toContain("Aroma Café");
    expect(prompt).toContain("warm and inviting");
    expect(prompt).toContain("Coffee lovers in Baghdad");
  });

  it("folds in the plan-level visualTheme for cross-scene consistency when present", () => {
    const themed = plan({ visualTheme: { photographyStyle: "warm editorial food photography", lighting: "soft golden-hour window light", colorTemperature: "warm" } });
    const prompt = buildSceneVisualPrompt(themed, scene());
    expect(prompt).toContain("warm editorial food photography");
    expect(prompt).toContain("soft golden-hour window light");
  });

  it("falls back to visualStyle when there is no visualTheme", () => {
    const prompt = buildSceneVisualPrompt(plan({ visualTheme: null }), scene());
    expect(prompt).toContain("Visual style: luxury");
  });

  it("always forbids embedded text/logos/watermarks, regardless of language", () => {
    const arPrompt = buildSceneVisualPrompt(plan({ language: "ar" }), scene());
    const enPrompt = buildSceneVisualPrompt(plan({ language: "en" }), scene());
    expect(arPrompt).toContain("no text, letters, words, numbers, logos, watermarks");
    expect(enPrompt).toContain("no text, letters, words, numbers, logos, watermarks");
  });
});

describe("visualPromptDedupeKey", () => {
  it("normalizes case and whitespace so near-identical prompts share a dedupe key", () => {
    const a = visualPromptDedupeKey("  Fresh Espresso   Pouring into a cup. ");
    const b = visualPromptDedupeKey("fresh espresso pouring into a cup.");
    expect(a).toBe(b);
  });

  it("treats genuinely different prompts as different keys", () => {
    expect(visualPromptDedupeKey("coffee beans")).not.toBe(visualPromptDedupeKey("coffee cup"));
  });
});
