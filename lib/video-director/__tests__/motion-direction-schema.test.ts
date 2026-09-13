import { describe, expect, it } from "vitest";
import { videoDirectorOutputSchema, sceneMotionDirectionSchema } from "@/lib/video-director/motion-direction-schema";

function validDirection(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sceneId: "s1",
    recommendation: "RUNWAY_VIDEO",
    reason: "Coffee pouring is the hero moment of this ad.",
    motionSubject: "the espresso stream and rising steam",
    primaryAction: "espresso pours continuously into the cup",
    secondaryActions: ["steam curls upward"],
    environmentalMotion: "soft background bokeh light shifts",
    cameraMotion: "subtle forward dolly",
    intensity: "strong",
    realismPriority: 0.9,
    preserveProductIdentity: true,
    negativeConstraints: ["no frozen still-image look", "no whole-image pan/zoom as the only motion"],
    runwayPrompt: "The espresso continuously pours and ripples; steam rises and curls.",
    ...overrides,
  };
}

describe("sceneMotionDirectionSchema", () => {
  it("accepts a complete RUNWAY_VIDEO direction", () => {
    expect(sceneMotionDirectionSchema.safeParse(validDirection()).success).toBe(true);
  });

  it("accepts a complete REMOTION_ONLY direction with every motion field null/empty", () => {
    const result = sceneMotionDirectionSchema.safeParse(
      validDirection({
        recommendation: "REMOTION_ONLY",
        motionSubject: null,
        primaryAction: null,
        secondaryActions: [],
        environmentalMotion: null,
        cameraMotion: null,
        intensity: null,
        realismPriority: null,
        preserveProductIdentity: false,
        negativeConstraints: [],
        runwayPrompt: null,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an unknown recommendation value", () => {
    expect(sceneMotionDirectionSchema.safeParse(validDirection({ recommendation: "MAYBE" })).success).toBe(false);
  });

  it("rejects an unknown intensity value", () => {
    expect(sceneMotionDirectionSchema.safeParse(validDirection({ intensity: "extreme" })).success).toBe(false);
  });

  it("rejects realismPriority outside 0-1", () => {
    expect(sceneMotionDirectionSchema.safeParse(validDirection({ realismPriority: 1.5 })).success).toBe(false);
    expect(sceneMotionDirectionSchema.safeParse(validDirection({ realismPriority: -0.1 })).success).toBe(false);
  });

  it("rejects a missing required field (reason)", () => {
    const direction = validDirection();
    delete (direction as Record<string, unknown>).reason;
    expect(sceneMotionDirectionSchema.safeParse(direction).success).toBe(false);
  });

  it("rejects preserveProductIdentity as undefined (must be a real boolean, not omitted)", () => {
    const direction = validDirection();
    delete (direction as Record<string, unknown>).preserveProductIdentity;
    expect(sceneMotionDirectionSchema.safeParse(direction).success).toBe(false);
  });
});

describe("videoDirectorOutputSchema", () => {
  it("accepts a list of valid scene directions", () => {
    const result = videoDirectorOutputSchema.safeParse({ scenes: [validDirection(), validDirection({ sceneId: "s2" })] });
    expect(result.success).toBe(true);
  });

  it("rejects an empty scenes array", () => {
    expect(videoDirectorOutputSchema.safeParse({ scenes: [] }).success).toBe(false);
  });

  it("rejects more than 12 scenes", () => {
    const scenes = Array.from({ length: 13 }, (_, i) => validDirection({ sceneId: `s${i}` }));
    expect(videoDirectorOutputSchema.safeParse({ scenes }).success).toBe(false);
  });
});
