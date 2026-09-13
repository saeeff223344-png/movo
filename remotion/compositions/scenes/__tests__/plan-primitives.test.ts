import { describe, expect, it } from "vitest";
import {
  pickKenBurnsMotion,
  fullBleedKenBurnsScale,
  splitIntoWords,
  splitIntoLines,
  fastImageMotionScale,
  pickCropFocusOrigin,
  currentCropSegment,
} from "@/remotion/compositions/scenes/plan-primitives";

describe("pickKenBurnsMotion", () => {
  it("is deterministic — the same scene id always yields the same motion", () => {
    const a = pickKenBurnsMotion("scene-hook-1");
    const b = pickKenBurnsMotion("scene-hook-1");
    expect(a).toEqual(b);
  });

  it("returns a direction of exactly 1 or -1", () => {
    for (const id of ["a", "b", "c", "hook", "cta-scene", "s5"]) {
      expect([1, -1]).toContain(pickKenBurnsMotion(id).direction);
    }
  });

  it("returns a transformOrigin from the known focal-point set", () => {
    const ORIGINS = ["50% 50%", "30% 35%", "70% 35%", "35% 70%", "65% 70%"];
    for (const id of ["a", "b", "c", "hook", "cta-scene", "s5"]) {
      expect(ORIGINS).toContain(pickKenBurnsMotion(id).transformOrigin);
    }
  });

  it("varies across different scene ids (not the same motion for every scene)", () => {
    const results = ["s1", "s2", "s3", "s4", "s5"].map((id) => JSON.stringify(pickKenBurnsMotion(id)));
    expect(new Set(results).size).toBeGreaterThan(1);
  });
});

/**
 * Regression coverage for a real bug caught during Automatic Visual Assets
 * phase visual QA: a full-bleed `objectFit: cover` image scaled below 1.0
 * (the "zoom out" direction, using the same formula as the card-shaped
 * useKenBurns above) exposed the flat palette background at the frame's
 * edges — undermining the entire "real photo, not gradient" fix. Every
 * frame of every direction must stay >= 1.
 */
describe("fullBleedKenBurnsScale", () => {
  const DURATION = 90;

  it("never drops below 1 for the 'in' direction, at any frame in the scene", () => {
    for (let frame = 0; frame <= DURATION; frame += 5) {
      expect(fullBleedKenBurnsScale(frame, DURATION, 1)).toBeGreaterThanOrEqual(1);
    }
  });

  it("never drops below 1 for the 'out' direction, at any frame in the scene", () => {
    for (let frame = 0; frame <= DURATION; frame += 5) {
      expect(fullBleedKenBurnsScale(frame, DURATION, -1)).toBeGreaterThanOrEqual(1);
    }
  });

  it("'in' animates from 1 up to 1.08 across the scene", () => {
    expect(fullBleedKenBurnsScale(0, DURATION, 1)).toBeCloseTo(1);
    expect(fullBleedKenBurnsScale(DURATION, DURATION, 1)).toBeCloseTo(1.08);
  });

  it("'out' animates from 1.08 down to 1 across the scene", () => {
    expect(fullBleedKenBurnsScale(0, DURATION, -1)).toBeCloseTo(1.08);
    expect(fullBleedKenBurnsScale(DURATION, DURATION, -1)).toBeCloseTo(1);
  });

  it("handles a zero-duration scene without dividing by zero", () => {
    expect(Number.isFinite(fullBleedKenBurnsScale(0, 0, 1))).toBe(true);
  });
});

/**
 * True Motion Graphics Engine phase, Requirement 4/13: every kinetic-text
 * component must split on whitespace only — never inside a word — so
 * Arabic connected letterforms are never separated into unshaped
 * fragments. These tests assert the actual word/character counts survive
 * the split, which is the concrete, checkable form of "Arabic shaping is
 * preserved" for a plain-string split (no font-shaping engine involved).
 */
describe("splitIntoWords (Arabic-safe segmentation)", () => {
  it("splits Arabic text into whole words, never individual letters", () => {
    const words = splitIntoWords("قهوة تُشعرك بالفرق");
    expect(words).toEqual(["قهوة", "تُشعرك", "بالفرق"]);
  });

  it("never produces a fragment shorter than its source word (no mid-word split)", () => {
    const source = "الأجواء الدافئة والمكان المناسب للقاءات";
    const words = splitIntoWords(source);
    const sourceWords = source.split(" ");
    expect(words).toEqual(sourceWords);
  });

  it("collapses multiple/irregular whitespace without dropping words", () => {
    expect(splitIntoWords("قهوة   تُشعرك\tبالفرق")).toEqual(["قهوة", "تُشعرك", "بالفرق"]);
  });

  it("returns an empty array for blank input", () => {
    expect(splitIntoWords("   ")).toEqual([]);
    expect(splitIntoWords("")).toEqual([]);
  });

  it("works identically for English text", () => {
    expect(splitIntoWords("Coffee that feels different")).toEqual(["Coffee", "that", "feels", "different"]);
  });
});

describe("splitIntoLines (Arabic-safe line grouping)", () => {
  it("groups whole words into lines without ever splitting inside a word", () => {
    const lines = splitIntoLines("قهوة تُشعرك بالفرق كل صباح جديد", 3);
    expect(lines).toEqual(["قهوة تُشعرك بالفرق", "كل صباح جديد"]);
  });

  it("every word in the source appears intact in exactly one line", () => {
    const source = "الأجواء الدافئة والمكان المناسب للقاءات الجميلة";
    const sourceWords = splitIntoWords(source);
    const lines = splitIntoLines(source, 2);
    const reconstructed = lines.flatMap((line) => splitIntoWords(line));
    expect(reconstructed).toEqual(sourceWords);
  });

  it("defaults to 3 words per line", () => {
    const lines = splitIntoLines("one two three four five six seven");
    expect(lines).toEqual(["one two three", "four five six", "seven"]);
  });

  it("returns a single line for text shorter than wordsPerLine", () => {
    expect(splitIntoLines("قهوة طازجة", 3)).toEqual(["قهوة طازجة"]);
  });

  it("returns an empty array for blank input", () => {
    expect(splitIntoLines("")).toEqual([]);
  });
});

/**
 * Fast-Paced True Motion Graphics phase, Requirement 4/10: high-intensity
 * scenes replace the slow whole-scene Ken Burns drift with a fast entrance
 * punch + periodic accent bumps. These tests lock down the concrete,
 * checkable promises: always >= 1 (never exposes the flat background at
 * the frame edges — the same invariant fullBleedKenBurnsScale enforces),
 * settles quickly, and genuinely pulses at each accent hit.
 */
describe("fastImageMotionScale", () => {
  const INTRO_END = 5; // a realistic high-intensity introEnd for a short scene

  it("never drops below 1 — the full-bleed cover-safety invariant, same as fullBleedKenBurnsScale", () => {
    for (let frame = 0; frame <= 60; frame++) {
      expect(fastImageMotionScale(frame, INTRO_END, [])).toBeGreaterThanOrEqual(1);
    }
  });

  it("starts noticeably zoomed in (a real 'punch') and settles down by introEnd", () => {
    const atStart = fastImageMotionScale(0, INTRO_END, []);
    const atIntroEnd = fastImageMotionScale(INTRO_END, INTRO_END, []);
    expect(atStart).toBeGreaterThan(atIntroEnd);
    expect(atIntroEnd).toBeLessThan(1.05); // settled close to baseline
  });

  it("produces a visible bump exactly at an accent hit frame, decaying away from it", () => {
    const atHit = fastImageMotionScale(50, INTRO_END, [50]);
    const farFromHit = fastImageMotionScale(50, INTRO_END, [200]);
    expect(atHit).toBeGreaterThan(farFromHit);
  });

  it("is deterministic", () => {
    expect(fastImageMotionScale(30, INTRO_END, [20, 40])).toBe(fastImageMotionScale(30, INTRO_END, [20, 40]));
  });
});

describe("pickCropFocusOrigin", () => {
  it("is deterministic for the same scene id and hit index", () => {
    expect(pickCropFocusOrigin("scene-1", 2)).toBe(pickCropFocusOrigin("scene-1", 2));
  });

  it("varies across different hit indices for the same scene (a real 'crop change', not a frozen frame)", () => {
    const origins = new Set([0, 1, 2, 3, 4].map((i) => pickCropFocusOrigin("scene-1", i)));
    expect(origins.size).toBeGreaterThan(1);
  });

  it("returns a valid CSS transform-origin percentage pair", () => {
    expect(pickCropFocusOrigin("scene-1", 0)).toMatch(/^\d+% \d+%$/);
  });
});

describe("currentCropSegment", () => {
  it("is 0 before any accent hit has fired", () => {
    expect(currentCropSegment(5, [10, 20, 30])).toBe(0);
  });

  it("increments by one after each hit fires", () => {
    expect(currentCropSegment(15, [10, 20, 30])).toBe(1);
    expect(currentCropSegment(25, [10, 20, 30])).toBe(2);
    expect(currentCropSegment(35, [10, 20, 30])).toBe(3);
  });

  it("returns 0 for a scene with no accent hits at all (low/medium intensity)", () => {
    expect(currentCropSegment(100, [])).toBe(0);
  });
});
