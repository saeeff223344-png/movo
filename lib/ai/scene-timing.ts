/**
 * Seconds -> whole Remotion frames, rounded to the nearest frame. Never
 * returns 0 for a positive duration — a scene must occupy at least one
 * frame or Remotion's <Sequence durationInFrames> rejects it.
 */
export function secondsToFrames(seconds: number, fps: number): number {
  return Math.max(1, Math.round(seconds * fps));
}
