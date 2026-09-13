import { describe, expect, it } from "vitest";
import { buildContinuousScript, mapAlignmentToTimings } from "../continuous-narration";

describe("buildContinuousScript", () => {
  it("joins segments with a single space and adds sentence punctuation when missing", () => {
    const script = buildContinuousScript([
      { sceneId: "s1", text: "جوعان" },
      { sceneId: "s2", text: "جرب برجر هاوس." },
    ]);
    expect(script.fullText).toBe("جوعان. جرب برجر هاوس.");
  });

  it("never duplicates punctuation already present", () => {
    const script = buildContinuousScript([{ sceneId: "s1", text: "هل أنت جاهز؟" }]);
    expect(script.fullText).toBe("هل أنت جاهز؟");
  });

  it("computes exact, non-overlapping character ranges for every segment", () => {
    const script = buildContinuousScript([
      { sceneId: "s1", text: "Hi" },
      { sceneId: "s2", text: "there" },
    ]);
    expect(script.segments).toEqual([
      { sceneId: "s1", startChar: 0, endChar: 3 }, // "Hi." (period added)
      { sceneId: "s2", startChar: 4, endChar: 10 }, // "there."
    ]);
    expect(script.fullText.slice(script.segments[0].startChar, script.segments[0].endChar)).toBe("Hi.");
    expect(script.fullText.slice(script.segments[1].startChar, script.segments[1].endChar)).toBe("there.");
  });

  it("handles a single segment with no separator needed", () => {
    const script = buildContinuousScript([{ sceneId: "only", text: "One line" }]);
    expect(script.fullText).toBe("One line.");
    expect(script.segments).toEqual([{ sceneId: "only", startChar: 0, endChar: 9 }]);
  });
});

describe("mapAlignmentToTimings", () => {
  it("maps each segment's real start/end time from character alignment", () => {
    const script = buildContinuousScript([
      { sceneId: "s1", text: "Hi." },
      { sceneId: "s2", text: "There." },
    ]);
    // "Hi. There." -> indices: H(0) i(1) .(2) (space,3) T(4) h(5) e(6) r(7) e(8) .(9)
    const chars = script.fullText.split("");
    const starts = chars.map((_, i) => i * 0.1);
    const ends = chars.map((_, i) => i * 0.1 + 0.1);

    const timings = mapAlignmentToTimings(script, { characters: chars, characterStartTimesSeconds: starts, characterEndTimesSeconds: ends });

    expect(timings).toHaveLength(2);
    expect(timings[0].sceneId).toBe("s1");
    expect(timings[0].startSeconds).toBeCloseTo(0);
    expect(timings[0].endSeconds).toBeCloseTo(0.3);
    expect(timings[1].sceneId).toBe("s2");
    expect(timings[1].startSeconds).toBeCloseTo(0.4);
    expect(timings[1].endSeconds).toBeCloseTo(1.0);
  });

  it("never returns an end time before its own start time, even with a malformed/short alignment", () => {
    const script = buildContinuousScript([{ sceneId: "s1", text: "Hello there friend" }]);
    const timings = mapAlignmentToTimings(script, { characters: [], characterStartTimesSeconds: [], characterEndTimesSeconds: [] });
    expect(timings).toEqual([{ sceneId: "s1", startSeconds: 0, endSeconds: 0 }]);
  });
});
