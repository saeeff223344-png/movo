import type { MotionIntensity } from "./motion-profiles";

/**
 * True Motion Graphics Engine phase — the shared beat vocabulary every
 * scene's layers time themselves against (Requirement 2/9), instead of
 * each layout hand-picking its own ad hoc `delay` per element. A "beat" is
 * a named frame offset proportional to the scene's own (narration-driven —
 * see lib/audio/scene-audio-sync.ts) duration, so a 2s beat and a 6s beat
 * both get a rhythm scaled to fit, rather than a fixed frame count that
 * would eat a short scene alive or leave a long one static for seconds.
 *
 * Fast-Paced True Motion Graphics phase, Requirement 2/8: the single
 * proportional curve this used to always apply left a real, measured gap
 * — for a 4s scene, ~1.2s between the secondary reveal and the hold beat
 * where NOTHING new happened (the "too slow, feels like moving photos"
 * complaint, concretely). Two fixes: (1) `MotionIntensity` now selects a
 * genuinely different curve — high intensity compresses hit/reveal/
 * secondary-hit/motion-shift into the first ~45% of the scene and starts
 * transition-prep at 65% instead of 85%, matching Requirement 2's "hit,
 * reveal, secondary hit, motion shift, transition" vocabulary; (2)
 * `accentHits` fills whatever's left with periodic beats every ~0.5s for
 * high intensity specifically, so a longer high-energy scene never sits
 * dead for more than half a second (Requirement 8) — low/medium intensity
 * get none, since a controlled, deliberate hold is exactly what luxury/
 * premium pacing wants.
 *
 * This does NOT synchronize to literal spoken words — there is no mapping
 * from on-screen text to narration text/timing in this codebase (the two
 * are deliberately independent copy, see plan-scene-layouts.tsx's
 * captionNarration docstring), so per-word narration sync is out of scope.
 */

export type SceneBeats = {
  /** Frame the scene's first layer (background/hero visual) starts settling by — the "hit" beat for high intensity. */
  introEnd: number;
  /** Frame the primary content (headline/hero image/main product) should have fully revealed by — the "reveal" beat. */
  primaryRevealEnd: number;
  /** Frame secondary content (supporting text/badge/detail) should have fully revealed by — the "secondary hit" beat. */
  secondaryRevealEnd: number;
  /** Frame the scene settles into its held, mostly-static-but-idly-alive state — the "motion shift" beat. */
  holdEnd: number;
  /** Frame transition-prep (subtle pre-exit motion) may begin — the "transition" beat. */
  transitionPrepStart: number;
  /** Extra periodic beats between the secondary hit and transition-prep (Requirement 8) — always empty for low/medium intensity, spaced ~0.5s apart for high intensity. */
  accentHits: number[];
};

/** Never below 1 frame and never past the scene's own last frame — guards every beat against a very short (min 0.5s) scene collapsing beats to 0 or overlapping durationInFrames. */
function clampBeat(frame: number, durationInFrames: number): number {
  return Math.max(1, Math.min(Math.round(frame), Math.max(1, durationInFrames - 1)));
}

type BeatCurve = { intro: number; primary: number; secondary: number; hold: number; prep: number };

const INTENSITY_CURVE: Record<MotionIntensity, BeatCurve> = {
  // Deliberately slightly SLOWER than the old universal curve — luxury/real-estate's explicit "remain controlled" exception.
  low: { intro: 0.15, primary: 0.38, secondary: 0.6, hold: 0.85, prep: 0.9 },
  // Unchanged from the original True Motion Graphics Engine curve.
  medium: { intro: 0.12, primary: 0.32, secondary: 0.52, hold: 0.82, prep: 0.85 },
  // Compressed into the first ~45-65% of the scene — everything meaningful happens fast, transition-prep starts much earlier so cuts feel punchy rather than arriving after a long hold.
  high: { intro: 0.03, primary: 0.12, secondary: 0.22, hold: 0.45, prep: 0.65 },
};

/** ~0.5s @ 30fps (this codebase's one fixed fps, AD_FPS — see remotion/constants.ts) — frequent enough that a high-intensity scene never goes more than half a second without a fresh accent, never so frequent it reads as flicker. */
const HIGH_INTENSITY_ACCENT_SPACING_FRAMES = 15;

/**
 * Intensity-aware beat timeline for a scene of `durationInFrames` — pure,
 * deterministic, no per-scene randomness needed since the proportions
 * themselves (not scene identity) are what create the timeline; per-scene
 * *variety* comes from which layers/reveal styles a layout assigns to each
 * beat (see motion-profiles.ts's pickTextRevealStyle and the layouts that
 * consume these beats), not from perturbing the beats themselves.
 */
export function sceneBeats(durationInFrames: number, intensity: MotionIntensity): SceneBeats {
  const safeDuration = Math.max(1, durationInFrames);
  const curve = INTENSITY_CURVE[intensity];

  const introEnd = clampBeat(safeDuration * curve.intro, safeDuration);
  const primaryRevealEnd = clampBeat(safeDuration * curve.primary, safeDuration);
  const secondaryRevealEnd = clampBeat(safeDuration * curve.secondary, safeDuration);
  const holdEnd = clampBeat(safeDuration * curve.hold, safeDuration);
  const transitionPrepStart = clampBeat(safeDuration * curve.prep, safeDuration);

  const accentHits: number[] = [];
  if (intensity === "high") {
    for (let frame = secondaryRevealEnd + HIGH_INTENSITY_ACCENT_SPACING_FRAMES; frame < transitionPrepStart; frame += HIGH_INTENSITY_ACCENT_SPACING_FRAMES) {
      accentHits.push(Math.round(frame));
    }
  }

  return { introEnd, primaryRevealEnd, secondaryRevealEnd, holdEnd, transitionPrepStart, accentHits };
}

/**
 * Frame offset for the Nth layer in a staggered sequence anchored to a
 * beat (e.g. badge at layerIndex 0, headline at 1, subtext at 2, CTA at
 * 3) — every layout that stages multiple independently-timed layers reads
 * its delays from this instead of hand-picking magic numbers per element.
 */
export function layerDelay(beatFrame: number, layerIndex: number, staggerFrames: number): number {
  return Math.max(0, beatFrame + layerIndex * staggerFrames);
}

/**
 * A brief 0-1 pulse around `frame`, peaking at `centerFrame` and decaying
 * back to 0 within `windowFrames` on either side — the reusable "accent
 * hit" shape (Requirement 8: micro-shift/accent hit/graphic sweep at each
 * of a scene's accentHits) that drives a quick scale/opacity/position
 * punch on an element without a spring simulation. Deterministic: a pure
 * function of frame distance, safe to call from any component (image
 * crop-punches, decorative shape pulses, text emphasis) without importing
 * Remotion's `spring`.
 */
export function accentPulse(frame: number, centerFrame: number, windowFrames = 8): number {
  const distance = Math.abs(frame - centerFrame);
  if (distance >= windowFrames) return 0;
  return 1 - distance / windowFrames;
}

/** The strongest pulse among every accent hit at this frame — an element only needs to know "how punched am I right now", not which specific hit caused it. */
export function accentPulseAt(frame: number, accentHits: readonly number[], windowFrames = 8): number {
  let strongest = 0;
  for (const hit of accentHits) {
    const value = accentPulse(frame, hit, windowFrames);
    if (value > strongest) strongest = value;
  }
  return strongest;
}
