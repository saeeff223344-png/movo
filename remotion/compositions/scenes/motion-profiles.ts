import type { AdStyle } from "../ad-types";
import { hashString } from "@/lib/ai/scene-variety";

/**
 * True Motion Graphics Engine phase — category-aware motion LANGUAGE
 * (Requirement 6), distinct from AdPalette's springStiffness/springDamping
 * (ad-styles.ts), which already encodes per-style spring *personality* and
 * is reused here rather than duplicated. This file only adds the
 * choreography dimensions AdPalette doesn't own: how text reveals, how
 * fast layers stagger in, how strong parallax/decoration reads, and how
 * much idle drift a settled layer gets. `visualStyle` (AdStyle) is the
 * only structured "category" signal VideoPlan carries — prompt-builder.ts
 * already maps business category (coffee/beauty/tech/fashion/retail/real
 * estate) onto a visualStyle + palette choice, so keying motion off the
 * same field keeps one consistent creative-direction chain instead of
 * inventing a second, parallel category taxonomy.
 *
 * Fast-Paced True Motion Graphics phase, Requirement 9 ("Motion Intensity
 * System"): every style now also resolves to a coarse `MotionIntensity`
 * (low/medium/high) that choreography.ts and transition-motion.ts read to
 * decide how COMPRESSED a scene's timeline and transitions should be — the
 * actual fix for "too slow, too cinematic, feels like moving photos".
 * There is no literal "restaurant"/"coffee"/"real estate" field on
 * VideoPlan (only `visualStyle`), so intensity is mapped from the same 6
 * AdStyle values the rest of this codebase already treats as the category
 * signal: luxury alone stays deliberately calm (the brief's own explicit
 * "luxury/real-estate can remain controlled" exception); minimal and tech
 * read as controlled-but-clean (premium/beauty-adjacent — "medium");
 * fast/energetic/fun default to full commercial energy ("high") — matching
 * "retail/food/app/promo should default to much faster pacing".
 */

export type MotionIntensity = "low" | "medium" | "high";

export const MOTION_INTENSITY_BY_STYLE: Record<AdStyle, MotionIntensity> = {
  luxury: "low",
  minimal: "medium",
  tech: "medium",
  fast: "high",
  energetic: "high",
  fun: "high",
};

export function getMotionIntensity(style: AdStyle): MotionIntensity {
  return MOTION_INTENSITY_BY_STYLE[style];
}

export type TextRevealStyle = "word" | "line" | "mask" | "punch";

export type MotionProfile = {
  intensity: MotionIntensity;
  /** Frame gap between successive layer entrances (badge -> headline -> subtext -> CTA) — smaller reads snappier/energetic, larger reads more deliberate/luxurious. */
  layerStaggerFrames: number;
  /** Preferred word/line stagger speed inside a single text block. */
  wordStaggerFrames: number;
  /** Default text reveal treatment for this style — a per-scene picker can still deviate for variety (see pickTextRevealStyle). */
  textReveal: TextRevealStyle;
  /** How far a background layer should lag a foreground layer's transform, as a 0-1 fraction (0 = locked together, 1 = fully independent) — the parallax "depth" feel (Requirement 1/3). */
  parallaxStrength: number;
  /** Idle micro-motion amplitude multiplier applied on top of the base drift/float primitives (Requirement 7) — luxury/minimal drift slower and smaller, fast/energetic/fun stay livelier. */
  idleMotionScale: number;
  /** Relative density of ambient decorative motion (particles/sweeps/orbs) — kept subtle for minimal/luxury, fuller for fun/energetic. */
  decorationDensity: "low" | "medium" | "high";
};

/**
 * Fast-Paced phase: high-intensity stagger/reveal numbers were cut roughly
 * in half again from the already-tightened True Motion Graphics Engine
 * values (layerStaggerFrames 3-4 -> 2, wordStaggerFrames 2-3 -> 1) — at
 * 30fps a 2-frame layer stagger and 1-frame word stagger read as a rapid
 * "hit" sequence rather than a deliberate reveal, matching "meaningful
 * visual change every ~0.4-1.0s" (Requirement 1) at the level of
 * individual layers, not just whole scenes.
 */
export const MOTION_PROFILE_BY_STYLE: Record<AdStyle, MotionProfile> = {
  fast: { intensity: "high", layerStaggerFrames: 2, wordStaggerFrames: 1, textReveal: "punch", parallaxStrength: 0.35, idleMotionScale: 1.15, decorationDensity: "medium" },
  energetic: { intensity: "high", layerStaggerFrames: 2, wordStaggerFrames: 1, textReveal: "punch", parallaxStrength: 0.4, idleMotionScale: 1.3, decorationDensity: "high" },
  fun: { intensity: "high", layerStaggerFrames: 2, wordStaggerFrames: 1, textReveal: "punch", parallaxStrength: 0.4, idleMotionScale: 1.25, decorationDensity: "high" },
  tech: { intensity: "medium", layerStaggerFrames: 4, wordStaggerFrames: 2, textReveal: "line", parallaxStrength: 0.45, idleMotionScale: 0.9, decorationDensity: "medium" },
  minimal: { intensity: "medium", layerStaggerFrames: 5, wordStaggerFrames: 3, textReveal: "line", parallaxStrength: 0.5, idleMotionScale: 0.65, decorationDensity: "low" },
  luxury: { intensity: "low", layerStaggerFrames: 9, wordStaggerFrames: 5, textReveal: "mask", parallaxStrength: 0.55, idleMotionScale: 0.7, decorationDensity: "low" },
};

export function getMotionProfile(style: AdStyle): MotionProfile {
  return MOTION_PROFILE_BY_STYLE[style];
}

const ALL_TEXT_REVEALS: readonly TextRevealStyle[] = ["word", "line", "mask", "punch"];

/**
 * Deterministic (scene-id-seeded) text reveal choice: stays on the
 * style's own default most of the time (2 of every 3 scenes), but
 * deliberately deviates for the third so a whole video doesn't use the
 * exact same reveal treatment on every single headline — Requirement 4's
 * variety without abandoning the category's overall motion language.
 */
export function pickTextRevealStyle(sceneId: string, profile: MotionProfile): TextRevealStyle {
  const seed = hashString(sceneId);
  if (seed % 3 !== 0) return profile.textReveal;
  const alternatives = ALL_TEXT_REVEALS.filter((reveal) => reveal !== profile.textReveal);
  return alternatives[seed % alternatives.length];
}
