import type { TtsResult } from "./types";

export type VideoAudioCostSummary = {
  narrationCharacters: number;
  narrationSeconds: number;
  /** Sum of every result's known per-line cost, or null when NONE of them have a known rate (e.g. every line used the silent fallback). A mix of known and unknown still sums the known ones — a partial, minimum estimate rather than throwing the whole thing away. */
  estimatedTtsUsd: number | null;
  musicLicenseUsd: number | null;
};

/**
 * Phase 5's cost-bookkeeping seam: sums up what a video's narration would
 * cost from real TTS results (lib/audio/types.ts's TtsResult, produced by
 * whichever provider lib/audio/tts-provider-factory.ts picked) plus a
 * music track's license cost, so a later phase can turn this into real
 * quota accounting. Nothing here charges anything — this is purely a
 * measurement utility, per the Phase 5 brief's explicit instruction not to
 * implement quota enforcement yet.
 */
export function summarizeAudioCost(ttsResults: readonly TtsResult[], musicLicenseUsd: number | null): VideoAudioCostSummary {
  const narrationCharacters = ttsResults.reduce((sum, r) => sum + r.cost.characters, 0);
  const narrationSeconds = ttsResults.reduce((sum, r) => sum + r.durationSeconds, 0);
  const knownCosts = ttsResults.map((r) => r.cost.estimatedUsd).filter((cost): cost is number => cost !== null);
  const estimatedTtsUsd = knownCosts.length > 0 ? knownCosts.reduce((a, b) => a + b, 0) : null;

  return { narrationCharacters, narrationSeconds, estimatedTtsUsd, musicLicenseUsd };
}
