import { describe, expect, it } from "vitest";
import {
  computeSceneVariants,
  hashString,
  pickIndex,
  resolveSceneTransitions,
  VARIANT_COUNT_BY_PURPOSE,
} from "@/lib/ai/scene-variety";
import { SCENE_TRANSITIONS } from "@/lib/ai/video-plan-schema";
import { TRANSITION_FAMILY } from "@/lib/ai/transition-families";
import type { SceneType } from "@/lib/types/video";

describe("hashString", () => {
  it("is deterministic — same input always gives the same output", () => {
    expect(hashString("scene-1:hook")).toBe(hashString("scene-1:hook"));
  });

  it("gives different inputs different hashes (in general)", () => {
    expect(hashString("scene-1:hook")).not.toBe(hashString("scene-2:hook"));
  });

  it("always returns a non-negative integer", () => {
    for (const s of ["", "a", "scene-99:cta-scene", "طويل جدا"]) {
      const h = hashString(s);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(h)).toBe(true);
    }
  });
});

describe("pickIndex", () => {
  it("is deterministic for the same seed", () => {
    expect(pickIndex("scene-1:hook", 3)).toBe(pickIndex("scene-1:hook", 3));
  });

  it("always returns 0 when there is only one option", () => {
    expect(pickIndex("anything", 1)).toBe(0);
  });

  it("stays within [0, count)", () => {
    for (const seed of ["a", "b", "c", "scene-7"]) {
      const index = pickIndex(seed, 4);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(4);
    }
  });

  it("never returns the avoided index when there is more than one option", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g"]) {
      for (let count = 2; count <= 4; count++) {
        for (let avoid = 0; avoid < count; avoid++) {
          expect(pickIndex(seed, count, avoid)).not.toBe(avoid);
        }
      }
    }
  });
});

describe("computeSceneVariants", () => {
  it("is deterministic across repeated calls with the same scenes", () => {
    const scenes = [
      { id: "s1", purpose: "hook" as SceneType },
      { id: "s2", purpose: "product-reveal" as SceneType },
    ];
    expect(computeSceneVariants(scenes)).toEqual(computeSceneVariants(scenes));
  });

  it("never gives two consecutive same-purpose scenes the same variant", () => {
    const scenes = [
      { id: "a", purpose: "feature-list" as SceneType },
      { id: "b", purpose: "feature-list" as SceneType },
      { id: "c", purpose: "feature-list" as SceneType },
      { id: "d", purpose: "feature-list" as SceneType },
    ];
    const variants = computeSceneVariants(scenes);
    for (let i = 1; i < variants.length; i++) {
      expect(variants[i]).not.toBe(variants[i - 1]);
    }
  });

  it("allows two different-purpose neighbors to reuse the same variant number", () => {
    // hook variant 3 count, cta-scene variant 3 count — both may legitimately land on the same index; this must not throw or misbehave.
    const scenes = [
      { id: "s1", purpose: "hook" as SceneType },
      { id: "s2", purpose: "cta-scene" as SceneType },
    ];
    expect(() => computeSceneVariants(scenes)).not.toThrow();
  });

  it("keeps every variant within the declared count for its purpose", () => {
    const scenes = (Object.keys(VARIANT_COUNT_BY_PURPOSE) as SceneType[]).map((purpose, i) => ({
      id: `scene-${i}`,
      purpose,
    }));
    const variants = computeSceneVariants(scenes);
    variants.forEach((variant, i) => {
      expect(variant).toBeGreaterThanOrEqual(0);
      expect(variant).toBeLessThan(VARIANT_COUNT_BY_PURPOSE[scenes[i].purpose]);
    });
  });
});

describe("resolveSceneTransitions", () => {
  it("is deterministic across repeated calls", () => {
    const scenes = [
      { purpose: "hook" as SceneType, transition: "fast-cut" },
      { purpose: "cta-scene" as SceneType, transition: "fast-cut" },
    ];
    expect(resolveSceneTransitions(scenes, "tech")).toEqual(resolveSceneTransitions(scenes, "tech"));
  });

  it("keeps a valid requested transition when it doesn't collide with the previous scene", () => {
    const scenes = [
      { purpose: "hook" as SceneType, transition: "whip-left" },
      { purpose: "product-reveal" as SceneType, transition: "zoom-in" },
    ];
    expect(resolveSceneTransitions(scenes, "tech")).toEqual(["whip-left", "zoom-in"]);
  });

  it("falls back to a purpose-appropriate transition for a missing value", () => {
    const scenes = [{ purpose: "cta-scene" as SceneType, transition: undefined }];
    const [resolved] = resolveSceneTransitions(scenes, "luxury");
    expect(SCENE_TRANSITIONS).toContain(resolved);
  });

  it("falls back to a purpose-appropriate transition for an invalid value", () => {
    const scenes = [{ purpose: "hook" as SceneType, transition: "not-a-real-transition" }];
    const [resolved] = resolveSceneTransitions(scenes, "fast");
    expect(SCENE_TRANSITIONS).toContain(resolved);
  });

  it("never lets two consecutive scenes resolve to the same transition", () => {
    const scenes = Array.from({ length: 8 }, () => ({ purpose: "hook" as SceneType, transition: "fast-cut" }));
    const resolved = resolveSceneTransitions(scenes, "energetic");
    for (let i = 1; i < resolved.length; i++) {
      expect(resolved[i]).not.toBe(resolved[i - 1]);
    }
  });

  it("never lets two consecutive scenes resolve to the same transition even with missing/invalid input throughout", () => {
    const scenes = Array.from({ length: 6 }, () => ({ purpose: "cta-scene" as SceneType, transition: undefined }));
    const resolved = resolveSceneTransitions(scenes, "minimal");
    for (let i = 1; i < resolved.length; i++) {
      expect(resolved[i]).not.toBe(resolved[i - 1]);
    }
  });

  it("only ever resolves to a value from the canonical SCENE_TRANSITIONS list", () => {
    const scenes = [
      { purpose: "hook" as SceneType, transition: "cut" },
      { purpose: "hook" as SceneType, transition: "cut" },
      { purpose: "logo-reveal" as SceneType, transition: "bogus" },
    ];
    const resolved = resolveSceneTransitions(scenes, "fun");
    for (const t of resolved) {
      expect(SCENE_TRANSITIONS).toContain(t);
    }
  });

  it("(Requirement 8: family anti-repetition) never lets two consecutive scenes resolve to the same transition FAMILY, even when the requested values are technically different", () => {
    // push-left then push-right requested explicitly — different exact values, same "push" family.
    const scenes = [
      { purpose: "product-card" as SceneType, transition: "push-left" },
      { purpose: "product-card" as SceneType, transition: "push-right" },
    ];
    const resolved = resolveSceneTransitions(scenes, "minimal");
    expect(TRANSITION_FAMILY[resolved[0]]).not.toBe(TRANSITION_FAMILY[resolved[1]]);
  });

  it("(Requirement 8) breaks a same-family run across many consecutive scenes, never just the exact value", () => {
    const scenes = Array.from({ length: 6 }, (_, i) => ({
      purpose: "product-card" as SceneType,
      transition: i % 2 === 0 ? "zoom-in" : "zoom-out",
    }));
    const resolved = resolveSceneTransitions(scenes, "tech");
    for (let i = 1; i < resolved.length; i++) {
      expect(TRANSITION_FAMILY[resolved[i]]).not.toBe(TRANSITION_FAMILY[resolved[i - 1]]);
    }
  });

  it("(Requirement 8) still allows two different families to sit next to each other even if the purpose pool is small", () => {
    const scenes = [
      { purpose: "discount-badge" as SceneType, transition: "spin" },
      { purpose: "discount-badge" as SceneType, transition: "scale-pop" },
    ];
    // spin and scale-pop are different families ("spin" vs "pop") — must be left alone, not perturbed.
    expect(resolveSceneTransitions(scenes, "fun")).toEqual(["spin", "scale-pop"]);
  });
});
