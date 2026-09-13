import { SCENE_TRANSITIONS } from "@/lib/ai/video-plan-schema";
import type { SceneTransition, SceneType } from "@/lib/types/video";
import type { AdStyle } from "@/remotion/compositions/ad-types";
import { TRANSITION_FAMILY } from "@/lib/ai/transition-families";

/**
 * Motion & Variety Engine (Phase 4): every deterministic decision that
 * makes back-to-back scenes look different from each other, without ever
 * calling Math.random() — Remotion needs the exact same VideoPlan to
 * render the exact same frames every time. "Deterministic" here means: a
 * pure function of scene id + purpose (+ the previous scene's own
 * resolved choice), so re-rendering the same plan is always identical,
 * but two different scenes in the same plan very rarely land on the same
 * choice.
 */

const ALL_TRANSITIONS = new Set<string>(SCENE_TRANSITIONS);

/** Deterministic string hash (djb2 variant) — same input always produces the same non-negative integer. */
export function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33 + input.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Deterministically picks an index in [0, count). If `avoid` is given (the
 * neighboring scene's own pick) and the natural pick would collide with
 * it, nudges forward by one — so neighbors sharing a seed pattern still
 * land on different variants.
 */
export function pickIndex(seedKey: string, count: number, avoid?: number): number {
  if (count <= 1) return 0;
  const index = hashString(seedKey) % count;
  if (avoid !== undefined && index === avoid) {
    return (index + 1) % count;
  }
  return index;
}

// ---- Layout variants ----

/** How many distinct layout compositions plan-scene-layouts.tsx offers per purpose. */
export const VARIANT_COUNT_BY_PURPOSE: Record<SceneType, number> = {
  hook: 3,
  "kinetic-headline": 2,
  "product-reveal": 3,
  "product-card": 2,
  "phone-mockup": 2,
  "app-screenshot": 2,
  "split-screen": 2,
  "logo-reveal": 2,
  "price-scene": 2,
  "discount-badge": 2,
  "feature-list": 2,
  "cta-scene": 3,
};

/**
 * One variant index per scene, in order. Two consecutive scenes of the
 * SAME purpose never get the same variant (that's the realistic
 * repetition case — e.g. two feature-list beats back to back); different
 * purposes already look different by construction, so they're free to
 * reuse a variant number without it reading as repetitive.
 */
export function computeSceneVariants(scenes: readonly { id: string; purpose: SceneType }[]): number[] {
  const variants: number[] = [];
  scenes.forEach((scene, i) => {
    const count = VARIANT_COUNT_BY_PURPOSE[scene.purpose];
    const previous = scenes[i - 1];
    const avoid = previous && previous.purpose === scene.purpose ? variants[i - 1] : undefined;
    variants.push(pickIndex(`${scene.id}:${scene.purpose}`, count, avoid));
  });
  return variants;
}

// ---- Transitions ----

const FAST_TRANSITIONS: readonly SceneTransition[] = [
  "fast-cut",
  "whip-left",
  "whip-right",
  "flash",
  "scale-pop",
  "zoom-in",
  "zoom-out",
  "push-left",
  "push-right",
  "push-up",
  "push-down",
];

const SLOW_TRANSITIONS: readonly SceneTransition[] = ["luxury-fade", "light-sweep", "blur", "wipe", "fade"];

/** Which transitions suit each scene purpose, ordered most- to least-typical — also the cycle order used to de-duplicate a repeat. */
const TRANSITION_POOL_BY_PURPOSE: Record<SceneType, readonly SceneTransition[]> = {
  hook: FAST_TRANSITIONS,
  "kinetic-headline": ["fast-cut", "whip-left", "whip-right", "split-reveal", "zoom-in", "scale-pop"],
  "product-reveal": ["zoom-in", "scale-pop", "light-sweep", "push-left", "push-right", "card-swap"],
  "product-card": ["push-left", "push-right", "card-swap", "slide", "wipe"],
  "phone-mockup": ["zoom-in", "push-up", "spin", "light-sweep", "scale-pop"],
  "app-screenshot": ["wipe", "push-left", "push-right", "blur", "fade"],
  "split-screen": ["split-reveal", "wipe", "push-left", "push-right"],
  "logo-reveal": ["light-sweep", "luxury-fade", "scale-pop", "flash", "spin"],
  "price-scene": ["scale-pop", "flash", "zoom-in", "whip-left", "whip-right"],
  "discount-badge": ["spin", "scale-pop", "flash", "whip-left", "whip-right"],
  "feature-list": ["push-up", "push-down", "card-swap", "fast-cut", "wipe"],
  "cta-scene": ["luxury-fade", "light-sweep", "scale-pop", "flash", "blur"],
};

/** A style-appropriate subset used when the purpose pool needs narrowing (e.g. a "luxury" ad shouldn't get whip-left for its hook). */
const STYLE_TRANSITION_BIAS: Record<AdStyle, readonly SceneTransition[]> = {
  fast: FAST_TRANSITIONS,
  energetic: FAST_TRANSITIONS,
  tech: [...FAST_TRANSITIONS, "wipe", "blur", "split-reveal"],
  fun: [...FAST_TRANSITIONS, "spin", "card-swap", "flash"],
  luxury: SLOW_TRANSITIONS,
  minimal: ["fade", "wipe", "slide", "push-left", "push-right", "blur"],
};

function isValidTransition(value: string | undefined): value is SceneTransition {
  return value !== undefined && ALL_TRANSITIONS.has(value);
}

/**
 * Next pool entry after `from` that isn't in the same TRANSITION_FAMILY as
 * `previous` — used to break a back-to-back repeat deterministically
 * (never Math.random()). True Motion Graphics Engine phase, Requirement 8:
 * strengthened from "not the exact same value" to "not the same motion
 * FAMILY" — two consecutive push-left/push-right scenes read just as
 * repetitive as two identical push-lefts, even though they're technically
 * different values. Falls back to merely "not the same exact value" if no
 * pool entry avoids the family (a pool with only one family available),
 * so this can never fail to resolve.
 */
function nextDistinct(pool: readonly SceneTransition[], from: SceneTransition, previous: SceneTransition): SceneTransition {
  const startIndex = Math.max(pool.indexOf(from), 0);
  const previousFamily = TRANSITION_FAMILY[previous];

  for (let step = 1; step <= pool.length; step++) {
    const candidate = pool[(startIndex + step) % pool.length];
    if (TRANSITION_FAMILY[candidate] !== previousFamily) return candidate;
  }
  for (let step = 1; step <= pool.length; step++) {
    const candidate = pool[(startIndex + step) % pool.length];
    if (candidate !== previous) return candidate;
  }
  return from;
}

/**
 * Resolves the AI's requested transition per scene into one this scene
 * should actually use: falls back to a purpose+style-appropriate default
 * when the requested value is missing or invalid (never lets a bad value
 * reach the renderer), then nudges away from the previous scene's
 * resolved transition if they'd otherwise match — guaranteeing no two
 * consecutive scenes share a transition, using only the plan's own data.
 */
export function resolveSceneTransitions(
  scenes: readonly { purpose: SceneType; transition?: string }[],
  style: AdStyle,
): SceneTransition[] {
  const stylePool = STYLE_TRANSITION_BIAS[style];
  const resolved: SceneTransition[] = [];

  for (const scene of scenes) {
    const purposePool = TRANSITION_POOL_BY_PURPOSE[scene.purpose];
    const requested = scene.transition;

    let chosen: SceneTransition;
    if (isValidTransition(requested)) {
      chosen = requested;
    } else {
      chosen = purposePool.find((t) => stylePool.includes(t)) ?? purposePool[0];
    }

    const previous = resolved[resolved.length - 1];
    if (previous !== undefined && TRANSITION_FAMILY[chosen] === TRANSITION_FAMILY[previous]) {
      const cyclePool = purposePool.length > 1 ? purposePool : FAST_TRANSITIONS;
      chosen = nextDistinct(cyclePool, chosen, previous);
    }

    resolved.push(chosen);
  }

  return resolved;
}
