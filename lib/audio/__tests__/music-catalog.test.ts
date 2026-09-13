import { describe, expect, it } from "vitest";
import { MUSIC_CATALOG, getMusicTrack } from "@/lib/audio/music-catalog";
import { MUSIC_STYLES } from "@/lib/audio/types";

describe("getMusicTrack", () => {
  it("returns a track matching the requested style for every defined style", () => {
    for (const style of MUSIC_STYLES) {
      expect(getMusicTrack(style).style).toBe(style);
    }
  });

  it("has exactly one catalog entry per music style", () => {
    expect(MUSIC_CATALOG).toHaveLength(MUSIC_STYLES.length);
  });

  it("ships no bundled audio — every catalog entry's assetUrl is null (no copyrighted third-party music)", () => {
    for (const track of MUSIC_CATALOG) {
      expect(track.assetUrl).toBeNull();
    }
  });

  it("every track has a baseVolume and energy within a sane 0-1 range", () => {
    for (const track of MUSIC_CATALOG) {
      expect(track.baseVolume).toBeGreaterThan(0);
      expect(track.baseVolume).toBeLessThanOrEqual(1);
      expect(track.energy).toBeGreaterThanOrEqual(0);
      expect(track.energy).toBeLessThanOrEqual(1);
    }
  });
});
