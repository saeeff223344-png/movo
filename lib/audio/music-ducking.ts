export type DuckingConfig = {
  /** Fraction (0-1) of baseVolume the music drops to while narration plays. */
  duckFactor: number;
  /** How many seconds the ramp down/up itself takes. */
  rampSeconds: number;
};

/** Sensible default: music drops to 35% of its normal volume, ramping over 0.4s in each direction — audible but never abrupt. */
export const DEFAULT_DUCKING_CONFIG: DuckingConfig = { duckFactor: 0.35, rampSeconds: 0.4 };

export type NarrationIntervalFrames = { startFrame: number; endFrame: number };

/**
 * Computes background-music volume at a single frame, given every
 * narration interval (in absolute composition frames) for the whole
 * video. The ramp begins `rampFrames` before each interval's start and
 * finishes `rampFrames` after its end, linearly interpolating between
 * `baseVolume` and `duckedVolume` — never a hard cut. When two intervals'
 * ramps overlap (they normally won't, thanks to
 * scene-audio-sync.ts's trailing safety margin, but this stays correct
 * even if they did), the lowest (most ducked) candidate wins.
 *
 * Pure function of `frame` and the interval list, so it is exactly as
 * correct sampled once in a test as it is sampled 30 times a second by
 * Remotion's <Audio volume={(frame) => ...}> callback (see
 * remotion/compositions/PlanComposition.tsx) — there is only one
 * implementation of "what should the music be doing right now."
 */
export function musicVolumeAtFrame(
  frame: number,
  narrationIntervals: readonly NarrationIntervalFrames[],
  baseVolume: number,
  duckedVolume: number,
  rampFrames: number,
): number {
  let volume = baseVolume;

  for (const { startFrame, endFrame } of narrationIntervals) {
    const duckStart = startFrame - rampFrames;
    const restoreEnd = endFrame + rampFrames;
    if (frame < duckStart || frame > restoreEnd) continue;

    let candidate: number;
    if (frame < startFrame) {
      const t = rampFrames <= 0 ? 1 : (frame - duckStart) / rampFrames;
      candidate = baseVolume + (duckedVolume - baseVolume) * t;
    } else if (frame <= endFrame) {
      candidate = duckedVolume;
    } else {
      const t = rampFrames <= 0 ? 1 : (frame - endFrame) / rampFrames;
      candidate = duckedVolume + (baseVolume - duckedVolume) * t;
    }

    volume = Math.min(volume, candidate);
  }

  return volume;
}
