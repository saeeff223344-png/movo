import { describe, expect, it } from "vitest";
import { clampFontSizeForLength, SAFE_AREA_INSET, SAFE_AREA_PERCENT } from "@/remotion/compositions/scenes/layout-fit";

describe("SAFE_AREA_PERCENT / SAFE_AREA_INSET", () => {
  it("keeps a sane, non-trivial margin on every edge", () => {
    expect(SAFE_AREA_PERCENT).toBeGreaterThan(0);
    expect(SAFE_AREA_PERCENT).toBeLessThan(20);
  });

  it("formats as a CSS percentage matching SAFE_AREA_PERCENT", () => {
    expect(SAFE_AREA_INSET).toBe(`${SAFE_AREA_PERCENT}%`);
  });
});

describe("clampFontSizeForLength", () => {
  it("leaves short text at the base size", () => {
    expect(clampFontSizeForLength("MOVO", 80)).toBe(80);
    expect(clampFontSizeForLength("قصير", 80)).toBe(80);
  });

  it("shrinks a long headline below the base size", () => {
    const long = "This is a deliberately long English headline meant to stress-test text fitting inside the safe area";
    const size = clampFontSizeForLength(long, 80);
    expect(size).toBeLessThan(80);
  });

  it("shrinks a long Arabic headline below the base size", () => {
    const long = "هذا عنوان عربي طويل جدًا ومصمم عمدًا لاختبار احتواء النص داخل المنطقة الآمنة من الفيديو";
    const size = clampFontSizeForLength(long, 80);
    expect(size).toBeLessThan(80);
  });

  it("never shrinks below minFontSize regardless of length", () => {
    const veryLong = "a".repeat(500);
    const size = clampFontSizeForLength(veryLong, 80, { minFontSize: 20 });
    expect(size).toBeGreaterThanOrEqual(20);
  });

  it("shrinks progressively as text gets longer", () => {
    const short = clampFontSizeForLength("a".repeat(30), 80);
    const medium = clampFontSizeForLength("a".repeat(60), 80);
    const long = clampFontSizeForLength("a".repeat(120), 80);
    expect(short).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(long);
  });

  it("treats empty text as base size (nothing to overflow)", () => {
    expect(clampFontSizeForLength("", 80)).toBe(80);
    expect(clampFontSizeForLength("   ", 80)).toBe(80);
  });

  it("respects a custom softLimit", () => {
    const text = "a".repeat(15);
    expect(clampFontSizeForLength(text, 80, { softLimit: 24 })).toBe(80);
    expect(clampFontSizeForLength(text, 80, { softLimit: 10 })).toBeLessThan(80);
  });
});
