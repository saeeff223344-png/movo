import type { MusicStyle } from "./types";

export type MusicTrack = {
  id: string;
  style: MusicStyle;
  /** 0 (sparse/ambient) to 1 (driving/climactic) — used by music-selector.ts to bias style choice toward higher energy for urgent/short ads. */
  energy: number;
  /** Suggested loudness before ducking, as a 0-1 linear gain. */
  baseVolume: number;
  /**
   * Where the actual licensed audio file lives. Null until a real licensed
   * track (or a future AI music-generation provider, mirroring the TTS
   * provider abstraction in ./types.ts) is wired in. The Remotion
   * integration (plan-audio.ts) treats null exactly like "no music for this
   * plan": it renders nothing, never a placeholder tone standing in for
   * real music.
   */
  assetUrl: string | null;
  /** USD licensing cost for this track, or null when not applicable (e.g. royalty-free/owned) — bookkeeping only, see ./audio-cost.ts. */
  licenseCostUsd: number | null;
};

/**
 * MOVO ships no bundled audio — every entry's assetUrl is null until the
 * product/legal team adds a licensed file. This catalog exists so the rest
 * of the audio architecture (selection, ducking, Remotion integration) has
 * real, testable data to work against today, without depending on that
 * asset pipeline being ready. Do not add a real third-party/copyrighted
 * audio file's URL here without confirming it is actually licensed for
 * MOVO's commercial use.
 */
export const MUSIC_CATALOG: readonly MusicTrack[] = [
  { id: "energetic-1", style: "energetic", energy: 0.9, baseVolume: 0.55, assetUrl: null, licenseCostUsd: null },
  { id: "cinematic-1", style: "cinematic", energy: 0.6, baseVolume: 0.5, assetUrl: null, licenseCostUsd: null },
  { id: "luxury-1", style: "luxury", energy: 0.3, baseVolume: 0.4, assetUrl: null, licenseCostUsd: null },
  { id: "modern-1", style: "modern", energy: 0.55, baseVolume: 0.5, assetUrl: null, licenseCostUsd: null },
  { id: "minimal-1", style: "minimal", energy: 0.2, baseVolume: 0.35, assetUrl: null, licenseCostUsd: null },
  { id: "upbeat-1", style: "upbeat", energy: 0.75, baseVolume: 0.55, assetUrl: null, licenseCostUsd: null },
  { id: "technology-1", style: "technology", energy: 0.5, baseVolume: 0.45, assetUrl: null, licenseCostUsd: null },
  { id: "emotional-1", style: "emotional", energy: 0.35, baseVolume: 0.4, assetUrl: null, licenseCostUsd: null },
  { id: "calm-1", style: "calm", energy: 0.15, baseVolume: 0.3, assetUrl: null, licenseCostUsd: null },
];

/** One entry per MusicStyle exists above, so this always finds an exact match; the `?? MUSIC_CATALOG[0]` is defensive only. */
export function getMusicTrack(style: MusicStyle): MusicTrack {
  return MUSIC_CATALOG.find((t) => t.style === style) ?? MUSIC_CATALOG[0];
}
