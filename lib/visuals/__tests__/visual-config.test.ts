import { afterEach, describe, expect, it } from "vitest";
import { getMaxAutoVisualsPerVideo } from "@/lib/visuals/visual-config";

const ORIGINAL = process.env.MOVO_MAX_AUTO_VISUALS;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.MOVO_MAX_AUTO_VISUALS;
  else process.env.MOVO_MAX_AUTO_VISUALS = ORIGINAL;
});

describe("getMaxAutoVisualsPerVideo", () => {
  it("defaults to 3 when unset", () => {
    delete process.env.MOVO_MAX_AUTO_VISUALS;
    expect(getMaxAutoVisualsPerVideo()).toBe(3);
  });

  it("honors a valid positive integer override", () => {
    process.env.MOVO_MAX_AUTO_VISUALS = "5";
    expect(getMaxAutoVisualsPerVideo()).toBe(5);
  });

  it("falls back to the default for a non-numeric value", () => {
    process.env.MOVO_MAX_AUTO_VISUALS = "not-a-number";
    expect(getMaxAutoVisualsPerVideo()).toBe(3);
  });

  it("falls back to the default for zero or a negative value", () => {
    process.env.MOVO_MAX_AUTO_VISUALS = "0";
    expect(getMaxAutoVisualsPerVideo()).toBe(3);
    process.env.MOVO_MAX_AUTO_VISUALS = "-2";
    expect(getMaxAutoVisualsPerVideo()).toBe(3);
  });

  it("falls back to the default for a non-integer value", () => {
    process.env.MOVO_MAX_AUTO_VISUALS = "2.5";
    expect(getMaxAutoVisualsPerVideo()).toBe(3);
  });
});
