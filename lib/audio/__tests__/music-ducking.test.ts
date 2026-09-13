import { describe, expect, it } from "vitest";
import { musicVolumeAtFrame } from "@/lib/audio/music-ducking";

const BASE = 0.5;
const DUCKED = 0.175; // BASE * 0.35
const RAMP = 12;

describe("musicVolumeAtFrame", () => {
  it("returns baseVolume when there are no narration intervals at all (audio disabled / no narration)", () => {
    expect(musicVolumeAtFrame(100, [], BASE, DUCKED, RAMP)).toBe(BASE);
  });

  it("returns baseVolume far away from any narration interval", () => {
    const intervals = [{ startFrame: 100, endFrame: 200 }];
    expect(musicVolumeAtFrame(0, intervals, BASE, DUCKED, RAMP)).toBe(BASE);
    expect(musicVolumeAtFrame(500, intervals, BASE, DUCKED, RAMP)).toBe(BASE);
  });

  it("ramps smoothly down to duckedVolume as the frame approaches narration start", () => {
    const intervals = [{ startFrame: 100, endFrame: 200 }];
    const atRampStart = musicVolumeAtFrame(100 - RAMP, intervals, BASE, DUCKED, RAMP);
    const midRamp = musicVolumeAtFrame(100 - RAMP / 2, intervals, BASE, DUCKED, RAMP);
    const atNarrationStart = musicVolumeAtFrame(100, intervals, BASE, DUCKED, RAMP);

    expect(atRampStart).toBeCloseTo(BASE, 5);
    expect(atNarrationStart).toBeCloseTo(DUCKED, 5);
    expect(midRamp).toBeGreaterThan(DUCKED);
    expect(midRamp).toBeLessThan(BASE);
  });

  it("stays fully ducked throughout the narration interval, never abruptly changing mid-line", () => {
    const intervals = [{ startFrame: 100, endFrame: 200 }];
    for (const frame of [100, 130, 150, 170, 200]) {
      expect(musicVolumeAtFrame(frame, intervals, BASE, DUCKED, RAMP)).toBeCloseTo(DUCKED, 5);
    }
  });

  it("ramps smoothly back up to baseVolume after narration ends", () => {
    const intervals = [{ startFrame: 100, endFrame: 200 }];
    const atNarrationEnd = musicVolumeAtFrame(200, intervals, BASE, DUCKED, RAMP);
    const midRestore = musicVolumeAtFrame(200 + RAMP / 2, intervals, BASE, DUCKED, RAMP);
    const afterRestore = musicVolumeAtFrame(200 + RAMP, intervals, BASE, DUCKED, RAMP);

    expect(atNarrationEnd).toBeCloseTo(DUCKED, 5);
    expect(midRestore).toBeGreaterThan(DUCKED);
    expect(midRestore).toBeLessThan(BASE);
    expect(afterRestore).toBeCloseTo(BASE, 5);
  });

  it("never produces an abrupt jump: adjacent frames across a full ramp-down/ramp-up cycle differ only smoothly", () => {
    const intervals = [{ startFrame: 100, endFrame: 200 }];
    const frames = Array.from({ length: 200 }, (_, i) => 100 - RAMP + i * ((200 + RAMP - (100 - RAMP)) / 199));
    const volumes = frames.map((f) => musicVolumeAtFrame(f, intervals, BASE, DUCKED, RAMP));
    for (let i = 1; i < volumes.length; i++) {
      expect(Math.abs(volumes[i] - volumes[i - 1])).toBeLessThan(0.05);
    }
  });

  it("resolves overlapping/adjacent intervals by taking the most-ducked (minimum) volume", () => {
    const intervals = [
      { startFrame: 100, endFrame: 150 },
      { startFrame: 150, endFrame: 200 },
    ];
    expect(musicVolumeAtFrame(150, intervals, BASE, DUCKED, RAMP)).toBeCloseTo(DUCKED, 5);
  });

  it("handles rampFrames of 0 without dividing by zero", () => {
    const intervals = [{ startFrame: 100, endFrame: 200 }];
    expect(() => musicVolumeAtFrame(100, intervals, BASE, DUCKED, 0)).not.toThrow();
    expect(musicVolumeAtFrame(100, intervals, BASE, DUCKED, 0)).toBeCloseTo(DUCKED, 5);
  });

  it("is deterministic: repeated calls with the same inputs return the same value", () => {
    const intervals = [{ startFrame: 100, endFrame: 200 }];
    expect(musicVolumeAtFrame(130, intervals, BASE, DUCKED, RAMP)).toBe(musicVolumeAtFrame(130, intervals, BASE, DUCKED, RAMP));
  });
});
