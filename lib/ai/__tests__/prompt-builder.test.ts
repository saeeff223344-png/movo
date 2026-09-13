import { afterEach, describe, expect, it } from "vitest";
import {
  buildArabicNarrationDialectInstructions,
  buildPlannerInstructions,
  buildPlannerUserInput,
  EmptyPromptError,
  MAX_PROMPT_LENGTH,
} from "@/lib/ai/prompt-builder";
import type { GenerationSettings } from "@/lib/types/video";

const AUTO_SETTINGS: GenerationSettings = {
  duration: "auto",
  aspectRatio: "auto",
  language: "auto",
  platform: "auto",
  style: "auto",
};

const ORIGINAL_API_KEY = process.env.ELEVENLABS_API_KEY;
const ORIGINAL_ARABIC_VOICE_ID = process.env.ELEVENLABS_ARABIC_VOICE_ID;

function configureHaytham() {
  process.env.ELEVENLABS_API_KEY = "test-key";
  process.env.ELEVENLABS_ARABIC_VOICE_ID = "haytham-voice-id";
}

afterEach(() => {
  if (ORIGINAL_API_KEY === undefined) delete process.env.ELEVENLABS_API_KEY;
  else process.env.ELEVENLABS_API_KEY = ORIGINAL_API_KEY;

  if (ORIGINAL_ARABIC_VOICE_ID === undefined) delete process.env.ELEVENLABS_ARABIC_VOICE_ID;
  else process.env.ELEVENLABS_ARABIC_VOICE_ID = ORIGINAL_ARABIC_VOICE_ID;
});

describe("buildPlannerUserInput", () => {
  it("trims surrounding whitespace", () => {
    expect(buildPlannerUserInput("  hello world  ")).toBe("hello world");
  });

  it("throws EmptyPromptError for a blank prompt", () => {
    expect(() => buildPlannerUserInput("   ")).toThrow(EmptyPromptError);
  });

  it("caps the input at MAX_PROMPT_LENGTH", () => {
    const long = "a".repeat(MAX_PROMPT_LENGTH + 50);
    expect(buildPlannerUserInput(long)).toHaveLength(MAX_PROMPT_LENGTH);
  });
});

describe("buildPlannerInstructions", () => {
  it("adds no hard constraints when every setting is auto", () => {
    const instructions = buildPlannerInstructions(AUTO_SETTINGS);
    expect(instructions).not.toContain("MUST be");
    expect(instructions).not.toContain("MUST equal");
  });

  it("forces language when explicitly set", () => {
    const instructions = buildPlannerInstructions({ ...AUTO_SETTINGS, language: "en" });
    expect(instructions).toContain('"language" MUST be "en"');
  });

  it("teaches the planner to make deliberate audio decisions (Phase 5)", () => {
    const instructions = buildPlannerInstructions(AUTO_SETTINGS);
    expect(instructions).toContain('"audio" must always be a fully specified object, never null');
    expect(instructions).toContain('"voiceGender" is one of:');
    expect(instructions).toContain('"voiceStyle" is one of:');
    expect(instructions).toContain('"narrationPace" is one of:');
    expect(instructions).toContain('"musicStyle" is one of:');
    expect(instructions).toContain("Not every scene needs narration");
    expect(instructions).toContain('Never narrate "onScreenText" verbatim');
  });

  it("teaches the planner to choose a deliberate, brief-appropriate palette instead of defaulting to indigo/purple (Visual Quality Upgrade)", () => {
    const instructions = buildPlannerInstructions(AUTO_SETTINGS);
    expect(instructions).toContain('"palette" must almost always be a deliberate, fully-specified object');
    expect(instructions).toContain("never default to a generic indigo/purple/violet gradient out of habit");
    expect(instructions).toContain("restaurant/food/coffee");
    expect(instructions).toContain("cosmetics/beauty");
    expect(instructions).toContain("tech/app/SaaS");
    expect(instructions).toContain("fashion");
    expect(instructions).toContain("real estate");
    expect(instructions).toContain("retail/promo/sale");
    expect(instructions).toContain('If "brandColors" is non-null, build the palette around those colors first');
  });

  it("keeps onScreenText short and pushes explanation into narration (Visual Quality Upgrade)", () => {
    const instructions = buildPlannerInstructions(AUTO_SETTINGS);
    expect(instructions).toContain('"onScreenText" must be SHORT');
    expect(instructions).toContain("2-6 words for a headline/hook");
  });

  it("adds anti-repetition / composition-diversity rules (Visual Quality Upgrade)", () => {
    const instructions = buildPlannerInstructions(AUTO_SETTINGS);
    expect(instructions).toContain('Never pick the same "purpose" for two consecutive scenes');
    expect(instructions).toContain("pure typography/text-only beats");
    expect(instructions).toContain('Vary "textPosition" and "textAlign" across scenes');
  });

  it("teaches the planner to fill each scene's visual asset plan (Automatic Visual Assets)", () => {
    const instructions = buildPlannerInstructions(AUTO_SETTINGS);
    expect(instructions).toContain("Give almost every scene a \"visual\" object");
    expect(instructions).toContain('"subject" is a concrete, photographable description');
    expect(instructions).toContain('"role" is "hero"');
    expect(instructions).toContain('"usage" says how the visual should sit in the frame');
    expect(instructions).toContain('"preferUserAsset" is true');
    expect(instructions).toContain('"cropFocus" says where the important part of the image sits');
    expect(instructions).toContain('"importance" is "primary"');
  });

  it("teaches the planner to set one consistent visualTheme for the whole video (Automatic Visual Assets)", () => {
    const instructions = buildPlannerInstructions(AUTO_SETTINGS);
    expect(instructions).toContain('"visualTheme" ties every scene\'s visual together into one coherent campaign');
    expect(instructions).toContain('"photographyStyle", "lighting", and "colorTemperature"');
    expect(instructions).toContain("do not mix styles within one video");
  });

  it("forces platform, aspect ratio, duration, and style together", () => {
    const instructions = buildPlannerInstructions({
      duration: 15,
      aspectRatio: "9:16",
      language: "ar",
      platform: "reels",
      style: "luxury",
    });
    expect(instructions).toContain('"platform" MUST be "reels"');
    expect(instructions).toContain('"aspectRatio" MUST be "9:16"');
    expect(instructions).toContain('"durationSeconds" MUST equal 15');
    expect(instructions).toContain('"visualStyle" MUST be "luxury"');
    expect(instructions).toContain('"language" MUST be "ar"');
  });

  describe("Arabic narration dialect (Haytham/ElevenLabs)", () => {
    it("(a) instructs Egyptian narration when language could be Arabic and Haytham is configured", () => {
      configureHaytham();
      const instructions = buildPlannerInstructions(AUTO_SETTINGS);
      expect(instructions).toContain("Egyptian Arabic");
      expect(instructions).toContain('Every scene\'s "narration" MUST be written in');
    });

    it("(a) still instructs Egyptian narration when language is explicitly forced to \"ar\"", () => {
      configureHaytham();
      const instructions = buildPlannerInstructions({ ...AUTO_SETTINGS, language: "ar" });
      expect(instructions).toContain("Egyptian Arabic");
    });

    it("(b) explicitly keeps onScreenText and other Arabic fields neutral even while narration goes Egyptian", () => {
      configureHaytham();
      const instructions = buildPlannerInstructions(AUTO_SETTINGS);
      expect(instructions).toContain(
        'Every other Arabic field ("videoTitle", "business", "objective", "targetAudience", "tone", "cta", and every scene\'s "onScreenText", "visualDirection", "motionDirection") stays in clear, neutral Arabic understandable across all Arab countries',
      );
    });

    it("guards against Iraqi/Gulf/Levantine words leaking into Egyptian narration, and against dialect degrading into comedy", () => {
      configureHaytham();
      const instructions = buildPlannerInstructions(AUTO_SETTINGS);
      expect(instructions).toContain("شنو");
      expect(instructions).toContain("خلي");
      expect(instructions).toContain("not exaggerated, slangy, or comedic");
    });

    it("requires narration and onScreenText to stay factually consistent, never a word-by-word substitution", () => {
      configureHaytham();
      const instructions = buildPlannerInstructions(AUTO_SETTINGS);
      expect(instructions).toContain("same meaning, product facts, prices, offers, names, CTA, and claims");
      expect(instructions).toContain("never a word-by-word translation or substitution");
    });

    it("(c) leaves English-forced instructions completely unchanged by the dialect system", () => {
      const withoutHaytham = buildPlannerInstructions({ ...AUTO_SETTINGS, language: "en" });

      configureHaytham();
      const withHaytham = buildPlannerInstructions({ ...AUTO_SETTINGS, language: "en" });

      expect(withHaytham).toBe(withoutHaytham);
      expect(withHaytham).not.toContain("Egyptian");
    });

    it("(c) omits any dialect instruction entirely when no ElevenLabs voice is configured (today's default)", () => {
      delete process.env.ELEVENLABS_API_KEY;
      delete process.env.ELEVENLABS_ARABIC_VOICE_ID;
      const instructions = buildPlannerInstructions(AUTO_SETTINGS);
      expect(instructions).not.toContain("Egyptian");
      expect(instructions).not.toContain("narration dialect");
    });
  });
});

describe("buildArabicNarrationDialectInstructions", () => {
  it("returns no instructions for the neutral policy", () => {
    expect(buildArabicNarrationDialectInstructions("neutral")).toEqual([]);
  });

  it("(d) generalizes to a dialect MOVO has no voice for yet, without any Egyptian-specific wording", () => {
    const instructions = buildArabicNarrationDialectInstructions("saudi").join("\n");
    expect(instructions).toContain("Saudi Arabic");
    expect(instructions).not.toContain("Egyptian");
    expect(instructions).not.toContain("شنو");
    expect(instructions).not.toContain("not exaggerated, slangy, or comedic");
    expect(instructions).toContain('Every other Arabic field');
  });

  it("keeps the Iraqi/Gulf/Levantine word guard and comedic-tone guard specific to Egyptian", () => {
    const egyptian = buildArabicNarrationDialectInstructions("egyptian").join("\n");
    expect(egyptian).toContain("شنو");
    expect(egyptian).toContain("not exaggerated, slangy, or comedic");
  });
});
