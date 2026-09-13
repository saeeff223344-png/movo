import { describe, expect, it } from "vitest";
import { captionNarration, headlineText, LAYOUTS_WITH_OWN_IMAGE } from "@/remotion/compositions/scenes/plan-scene-layouts";
import type { Scene } from "@/lib/types/video";

function scene(overrides: Partial<Scene["content"]> = {}): Scene {
  return {
    id: "s1",
    type: "hook",
    durationInFrames: 30,
    content: {
      narration: "",
      onScreenText: "",
      visualDirection: "",
      motionDirection: "",
      textPosition: "center",
      textAlign: "center",
      imageUrl: "",
      variant: "0",
      ...overrides,
    },
  };
}

/**
 * These two helpers are the fix for a real locked-rule violation: several
 * Remotion layouts (plan-scene-layouts.tsx) used to render scene narration
 * as visible text. Once Arabic narration can be a spoken dialect (e.g.
 * Egyptian Arabic for the Haytham voice — see
 * lib/audio/providers/elevenlabs-voice-config.ts), that would put dialect
 * text on screen, breaking the rule that visible Arabic must always stay
 * neutral. Gating on `dir === "rtl"` makes this safe for every Arabic voice
 * automatically, not just Haytham, while leaving English untouched.
 */
describe("captionNarration", () => {
  it("never surfaces narration on screen for RTL (Arabic) scenes, even when narration is set", () => {
    const s = scene({ narration: "عايز فكرة؟ يلا بينا", onScreenText: "حوّل فكرتك إلى فيديو" });
    expect(captionNarration(s, "rtl")).toBe("");
  });

  it("returns narration unchanged for LTR (English) scenes — existing behavior preserved", () => {
    const s = scene({ narration: "Got an idea? Let's go", onScreenText: "Turn your idea into a video" });
    expect(captionNarration(s, "ltr")).toBe("Got an idea? Let's go");
  });

  it("returns an empty string for LTR too when there is no narration", () => {
    expect(captionNarration(scene({ narration: "" }), "ltr")).toBe("");
  });
});

describe("headlineText", () => {
  it("always prefers onScreenText when present, for both directions", () => {
    const s = scene({ narration: "دارجة مختلفة", onScreenText: "نص محايد" });
    expect(headlineText(s, "rtl")).toBe("نص محايد");
    expect(headlineText(s, "ltr")).toBe("نص محايد");
  });

  it("falls back to narration only for LTR when onScreenText is empty", () => {
    const s = scene({ narration: "Fallback narration line", onScreenText: "" });
    expect(headlineText(s, "ltr")).toBe("Fallback narration line");
  });

  it("never falls back to narration for RTL, even when onScreenText is empty — stays blank rather than risking dialect text on screen", () => {
    const s = scene({ narration: "لهجة مصرية للنطق فقط", onScreenText: "" });
    expect(headlineText(s, "rtl")).toBe("");
  });
});

/**
 * Automatic Visual Assets phase: PlanScene.tsx only shows the full-bleed
 * background image (PlanSceneBackground's FullBleedSceneImage) for a scene
 * type NOT in this set — locking down the exact membership here prevents a
 * silent double-image regression (a purpose gaining its own foreground
 * image handling later without also being added here would show the same
 * photo twice: once as a card, once full-bleed behind it).
 */
describe("LAYOUTS_WITH_OWN_IMAGE", () => {
  it("contains exactly the purposes whose own layout renders content.imageUrl itself", () => {
    expect([...LAYOUTS_WITH_OWN_IMAGE].sort()).toEqual(["app-screenshot", "logo-reveal", "phone-mockup", "product-card", "product-reveal", "split-screen"].sort());
  });

  it("does NOT include the previously text-only purposes now eligible for a full-bleed background image", () => {
    for (const purpose of ["hook", "kinetic-headline", "price-scene", "discount-badge", "feature-list", "cta-scene"] as const) {
      expect(LAYOUTS_WITH_OWN_IMAGE.has(purpose)).toBe(false);
    }
  });
});
