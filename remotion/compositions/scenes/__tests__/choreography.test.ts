import { describe, expect, it } from "vitest";
import { sceneBeats, layerDelay, accentPulse, accentPulseAt } from "@/remotion/compositions/scenes/choreography";
import type { MotionIntensity } from "@/remotion/compositions/scenes/motion-profiles";

const INTENSITIES: MotionIntensity[] = ["low", "medium", "high"];

describe("sceneBeats", () => {
  it("produces beats in strictly non-decreasing order, for every intensity", () => {
    for (const intensity of INTENSITIES) {
      const beats = sceneBeats(90, intensity);
      expect(beats.introEnd).toBeLessThanOrEqual(beats.primaryRevealEnd);
      expect(beats.primaryRevealEnd).toBeLessThanOrEqual(beats.secondaryRevealEnd);
      expect(beats.secondaryRevealEnd).toBeLessThanOrEqual(beats.holdEnd);
      expect(beats.holdEnd).toBeLessThanOrEqual(beats.transitionPrepStart);
    }
  });

  it("scales proportionally with duration — a longer scene gets a proportionally later primary reveal", () => {
    const short = sceneBeats(30, "medium");
    const long = sceneBeats(300, "medium");
    expect(long.primaryRevealEnd).toBeGreaterThan(short.primaryRevealEnd);
    expect(long.primaryRevealEnd / 300).toBeCloseTo(short.primaryRevealEnd / 30, 1);
  });

  it("never produces a beat below 1 frame, even for a very short (min duration) scene", () => {
    for (const intensity of INTENSITIES) {
      const beats = sceneBeats(15, intensity); // ~0.5s @ 30fps, the schema's MIN_DURATION_SECONDS-per-scene floor
      for (const [key, value] of Object.entries(beats)) {
        if (key === "accentHits") continue;
        expect(value as number).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("never produces a beat at or past the last frame of the scene", () => {
    for (const intensity of INTENSITIES) {
      const beats = sceneBeats(15, intensity);
      expect(beats.introEnd).toBeLessThan(15);
      expect(beats.primaryRevealEnd).toBeLessThan(15);
      expect(beats.secondaryRevealEnd).toBeLessThan(15);
      expect(beats.holdEnd).toBeLessThan(15);
      expect(beats.transitionPrepStart).toBeLessThan(15);
    }
  });

  it("handles a zero/negative duration without throwing or producing NaN", () => {
    for (const intensity of INTENSITIES) {
      const beats = sceneBeats(0, intensity);
      expect(Number.isFinite(beats.introEnd)).toBe(true);
      expect(beats.introEnd).toBeGreaterThanOrEqual(1);
    }
  });

  it("is deterministic — same duration and intensity always produces the same beats", () => {
    expect(sceneBeats(90, "high")).toEqual(sceneBeats(90, "high"));
  });

  /**
   * Fast-Paced True Motion Graphics phase, Requirement 1/2: the concrete,
   * checkable version of "too slow, feels like moving photos" — high
   * intensity must compress its early beats much tighter than low
   * (luxury/real-estate, explicitly allowed to "remain controlled") and
   * medium.
   */
  it("(Requirement 1/9) high intensity reveals its primary content much earlier than low intensity, for the same duration", () => {
    const DURATION = 120; // 4s @ 30fps
    const low = sceneBeats(DURATION, "low");
    const medium = sceneBeats(DURATION, "medium");
    const high = sceneBeats(DURATION, "high");
    expect(high.primaryRevealEnd).toBeLessThan(medium.primaryRevealEnd);
    expect(medium.primaryRevealEnd).toBeLessThan(low.primaryRevealEnd);
  });

  it("(Requirement 1) high intensity's very first beat (introEnd) lands well under 0.4s — a fast 'hit', not a slow build", () => {
    const DURATION = 120; // 4s @ 30fps
    const beats = sceneBeats(DURATION, "high");
    expect(beats.introEnd / 30).toBeLessThan(0.4);
  });

  it("(Requirement 2) high intensity starts transition-prep noticeably earlier than medium, for the same duration", () => {
    const DURATION = 150; // 5s
    const high = sceneBeats(DURATION, "high");
    const medium = sceneBeats(DURATION, "medium");
    expect(high.transitionPrepStart).toBeLessThan(medium.transitionPrepStart);
  });

  /**
   * Fast-Paced phase, Requirement 8 ("remove dead time"): for a scene long
   * enough to otherwise sit still, high intensity must guarantee a fresh
   * beat at least every ~0.5-1.0s between the secondary hit and
   * transition-prep; low/medium intentionally get none (a deliberate,
   * controlled hold is correct there).
   */
  describe("accentHits (Requirement 8: no dead time)", () => {
    it("is always empty for low and medium intensity", () => {
      expect(sceneBeats(300, "low").accentHits).toEqual([]);
      expect(sceneBeats(300, "medium").accentHits).toEqual([]);
    });

    it("fills a long high-intensity scene with hits spaced no more than ~1s apart", () => {
      const beats = sceneBeats(300, "high"); // 10s @ 30fps — plenty of room after the compressed early beats
      expect(beats.accentHits.length).toBeGreaterThan(0);
      const allFrames = [beats.secondaryRevealEnd, ...beats.accentHits, beats.transitionPrepStart];
      for (let i = 1; i < allFrames.length; i++) {
        expect(allFrames[i] - allFrames[i - 1]).toBeLessThanOrEqual(30); // <= 1s @ 30fps
      }
    });

    it("never places an accent hit outside [secondaryRevealEnd, transitionPrepStart)", () => {
      const beats = sceneBeats(300, "high");
      for (const hit of beats.accentHits) {
        expect(hit).toBeGreaterThan(beats.secondaryRevealEnd);
        expect(hit).toBeLessThan(beats.transitionPrepStart);
      }
    });

    it("produces no accent hits for a short high-intensity scene where none would fit", () => {
      const beats = sceneBeats(30, "high"); // 1s scene
      expect(beats.accentHits).toEqual([]);
    });

    it("is deterministic", () => {
      expect(sceneBeats(300, "high").accentHits).toEqual(sceneBeats(300, "high").accentHits);
    });
  });
});

describe("layerDelay", () => {
  it("staggers successive layers forward from the beat frame", () => {
    expect(layerDelay(10, 0, 4)).toBe(10);
    expect(layerDelay(10, 1, 4)).toBe(14);
    expect(layerDelay(10, 2, 4)).toBe(18);
  });

  it("never returns a negative frame", () => {
    expect(layerDelay(0, 0, 4)).toBeGreaterThanOrEqual(0);
  });
});

describe("accentPulse", () => {
  it("peaks at 1 exactly at the center frame", () => {
    expect(accentPulse(50, 50, 8)).toBe(1);
  });

  it("decays to 0 at the edge of the window and beyond", () => {
    expect(accentPulse(58, 50, 8)).toBe(0);
    expect(accentPulse(100, 50, 8)).toBe(0);
  });

  it("is symmetric around the center frame", () => {
    expect(accentPulse(46, 50, 8)).toBeCloseTo(accentPulse(54, 50, 8), 5);
  });

  it("never returns a negative value", () => {
    for (let f = 0; f < 100; f++) {
      expect(accentPulse(f, 50, 8)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("accentPulseAt", () => {
  it("returns 0 when there are no accent hits nearby", () => {
    expect(accentPulseAt(50, [], 8)).toBe(0);
    expect(accentPulseAt(50, [10, 200], 8)).toBe(0);
  });

  it("returns the strongest pulse among multiple nearby hits", () => {
    expect(accentPulseAt(50, [50, 100], 8)).toBe(1);
  });

  it("is deterministic", () => {
    expect(accentPulseAt(52, [50, 90], 8)).toBe(accentPulseAt(52, [50, 90], 8));
  });
});
