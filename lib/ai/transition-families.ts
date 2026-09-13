import type { SceneTransition } from "@/lib/types/video";

/**
 * True Motion Graphics Engine phase, Requirement 8: groups transitions by
 * how they visually read, so resolveSceneTransitions' anti-repetition
 * check (scene-variety.ts) can catch "push-left then push-right back to
 * back" (same family, technically different values, still reads as
 * repetitive). Deliberately kept free of any "remotion" package import —
 * scene-variety.ts is reachable from React Server Component code paths
 * (the real planner action's module graph), and "remotion" sets up a
 * React context at import time that RSC's stripped-down React runtime
 * can't provide ("Remotion requires React.createContext, but it is
 * undefined"). remotion/compositions/scenes/transition-motion.ts (which
 * DOES need real Remotion APIs for computeTransitionLayerMotion, safe
 * there since it's only ever imported by client-rendered Remotion
 * components) re-exports this same table rather than duplicating it.
 */
export const TRANSITION_FAMILY: Record<SceneTransition, string> = {
  cut: "cut",
  "fast-cut": "cut",
  fade: "fade",
  "luxury-fade": "fade",
  blur: "fade",
  slide: "slide",
  "zoom-in": "zoom",
  "zoom-out": "zoom",
  "push-left": "push",
  "push-right": "push",
  "push-up": "push",
  "push-down": "push",
  "whip-left": "whip",
  "whip-right": "whip",
  flash: "pop",
  "scale-pop": "pop",
  wipe: "sweep",
  "light-sweep": "sweep",
  "card-swap": "reveal",
  "split-reveal": "reveal",
  spin: "spin",
};
