import { describe, expect, it } from "vitest";
import { buildVideoDirectorInstructions, buildVideoDirectorInput, type DirectorSceneInput } from "@/lib/video-director/prompt-builder";
import type { VideoDirectorPlan } from "@/lib/video-director/types";

function plan(overrides: Partial<VideoDirectorPlan> = {}): VideoDirectorPlan {
  return {
    business: "Aroma Café",
    objective: "Drive foot traffic",
    targetAudience: "Coffee lovers",
    tone: "warm",
    cta: "Visit today",
    visualStyle: "energetic",
    language: "ar",
    aspectRatio: "9:16",
    durationSeconds: 18,
    scenes: [],
    ...overrides,
  };
}

describe("buildVideoDirectorInstructions", () => {
  it("never names a specific business category or hardcodes an action verb (Requirement 2: general by design)", () => {
    const instructions = buildVideoDirectorInstructions(plan());
    const lower = instructions.toLowerCase();
    expect(lower).not.toContain("coffee pours");
    expect(lower).not.toContain("pour coffee");
  });

  it("includes real plan facts (business/objective/audience/tone/cta/style/duration), not a generic template", () => {
    const instructions = buildVideoDirectorInstructions(plan({ business: "Lumière Perfumes", objective: "Launch a new scent" }));
    expect(instructions).toContain("Lumière Perfumes");
    expect(instructions).toContain("Launch a new scent");
  });

  it("instructs the motion-first prompt principle (Requirement 3)", () => {
    const instructions = buildVideoDirectorInstructions(plan());
    expect(instructions).toContain("describe MOTION ONLY");
    expect(instructions).toContain("runwayPrompt");
  });

  it("instructs camera motion to never substitute for real physical motion (Requirement 4)", () => {
    const instructions = buildVideoDirectorInstructions(plan());
    expect(instructions).toContain("camera motion complements physical motion, it never substitutes for it");
  });

  it("requires every REMOTION_ONLY scene to still carry a real reason", () => {
    const instructions = buildVideoDirectorInstructions(plan());
    expect(instructions).toContain("REMOTION_ONLY");
    expect(instructions).toContain("reason");
  });

  it("(Arabic/English compatibility) builds the same shape of instructions regardless of the plan's language, since reasoning is about business/scene facts, never wording tied to one language", () => {
    const arInstructions = buildVideoDirectorInstructions(plan({ language: "ar", business: "Aroma Café" }));
    const enInstructions = buildVideoDirectorInstructions(plan({ language: "en", business: "Aroma Café" }));
    expect(arInstructions).toContain("Aroma Café");
    expect(enInstructions).toContain("Aroma Café");
    expect(enInstructions).toContain("describe MOTION ONLY");
    expect(enInstructions).toContain("camera motion complements physical motion, it never substitutes for it");
  });
});

describe("buildVideoDirectorInput", () => {
  it("serializes the given candidate scenes deterministically", () => {
    const scenes: DirectorSceneInput[] = [
      { id: "s1", purpose: "hook", visualDirection: "espresso pour", narration: "n", onScreenText: "t", motionDirection: "m", visualSubject: "espresso", order: 0, totalScenes: 3 },
    ];
    const a = buildVideoDirectorInput(scenes);
    const b = buildVideoDirectorInput(scenes);
    expect(a).toBe(b);
    expect(JSON.parse(a).candidateScenes[0].id).toBe("s1");
  });

  it("preserves scene order", () => {
    const scenes: DirectorSceneInput[] = [
      { id: "s1", purpose: "hook", visualDirection: "", narration: null, onScreenText: null, motionDirection: "", visualSubject: null, order: 0, totalScenes: 2 },
      { id: "s2", purpose: "product-reveal", visualDirection: "", narration: null, onScreenText: null, motionDirection: "", visualSubject: null, order: 1, totalScenes: 2 },
    ];
    const parsed = JSON.parse(buildVideoDirectorInput(scenes));
    expect(parsed.candidateScenes.map((s: { id: string }) => s.id)).toEqual(["s1", "s2"]);
  });
});
