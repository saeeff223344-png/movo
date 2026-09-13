import type { SceneType } from "@/lib/types/video";
import type { SceneMotionDirection } from "./types";

/**
 * Dynamic AI Video Director phase, Requirement 5: purposes that are
 * ALWAYS information/typography — a price card, a discount badge, and a
 * logo mark have nothing to physically animate in any general sense, so
 * they're excluded from even being sent to the director LLM call
 * (Requirement 6: cost control extends to not spending tokens reasoning
 * about scenes with an obvious answer). Every other purpose (including
 * cta-scene and kinetic-headline) still goes to the director, since
 * whether THOSE specific scenes have real motion potential depends on the
 * actual content, not the purpose label alone — the director itself may
 * still say REMOTION_ONLY for any of them.
 */
const ALWAYS_TYPOGRAPHY_PURPOSES = new Set<SceneType>(["price-scene", "discount-badge", "logo-reveal"]);

/**
 * A scene is even a *candidate* for real video generation only when (a) it
 * already has a resolved still visual to animate (Runway image-to-video
 * needs a source image — a scene with nothing to show has nothing to
 * animate), and (b) its purpose isn't one of the always-typography ones
 * above.
 */
export function isSceneCandidateForVideoDirection(purpose: SceneType, hasResolvedVisual: boolean): boolean {
  return hasResolvedVisual && !ALWAYS_TYPOGRAPHY_PURPOSES.has(purpose);
}

/**
 * Dynamic AI Video Director phase, Requirement 6 (cost control): the
 * deterministic safety net applied AFTER the director's own
 * recommendations — no matter how many scenes the LLM recommends
 * RUNWAY_VIDEO for, at most `maxScenes` ever actually reach the paid
 * provider. Ranks by the director's own `realismPriority` (a scene the
 * director itself flagged as needing more photorealistic fidelity is
 * judged to benefit most from real video) — ties keep the plan's own
 * scene order (Array.prototype.sort is a stable sort), never
 * Math.random(). A direction missing `runwayPrompt` (shouldn't happen for
 * a RUNWAY_VIDEO recommendation, but defensively excluded) can never reach
 * the provider with nothing to send it.
 */
export function selectScenesForVideoGeneration(directions: readonly SceneMotionDirection[], maxScenes: number): SceneMotionDirection[] {
  const eligible = directions.filter((d) => d.recommendation === "RUNWAY_VIDEO" && d.runwayPrompt);
  const ranked = [...eligible].sort((a, b) => (b.realismPriority ?? 0) - (a.realismPriority ?? 0));
  return ranked.slice(0, Math.max(0, maxScenes));
}
