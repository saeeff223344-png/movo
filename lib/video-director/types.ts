import type { VideoPlan } from "@/lib/ai/video-plan-schema";

/**
 * Dynamic AI Video Director phase — the structured contract the director
 * LLM call fills in per scene. This is deliberately NOT a VideoPlan schema
 * extension: it's a second-stage enrichment computed AFTER stills exist
 * (lib/visuals/*), operating on the already-validated plan + resolved
 * visuals, and its own output never gets written back into VideoPlan or
 * persisted scene_plan JSON — so it carries zero backward-compatibility
 * risk for existing projects (see lib/video-director/video-director.ts's
 * docstring for the full reasoning).
 *
 * General by design (Requirement 2): nothing here names a business
 * category or hardcodes an action verb — "coffee pours" is exactly as
 * valid an instance of `primaryAction` as "fabric ripples" or "wheels
 * rotate"; the LLM call is what supplies the actual content, this type
 * only shapes it.
 */

export const MOTION_INTENSITIES = ["subtle", "moderate", "strong"] as const;
export type SceneMotionIntensity = (typeof MOTION_INTENSITIES)[number];

export const SCENE_MEDIA_RECOMMENDATIONS = ["RUNWAY_VIDEO", "REMOTION_ONLY"] as const;
export type SceneMediaRecommendation = (typeof SCENE_MEDIA_RECOMMENDATIONS)[number];

/**
 * One scene's motion direction — the director's structured answer to
 * "what should physically move here, and how". `runwayPrompt` is the only
 * field actually sent to the video-generation provider (Requirement 3: it
 * must describe MOTION, not re-describe the still image's appearance);
 * every other field exists so the director's reasoning is inspectable/
 * testable and so `negativeConstraints`/`preserveProductIdentity` can be
 * folded into the prompt deterministically rather than trusting the LLM
 * to always remember to mention them.
 */
export type SceneMotionDirection = {
  sceneId: string;
  recommendation: SceneMediaRecommendation;
  /** Why the director made this call — never shown to end users, kept for debugging/QA (Requirement 5: "with a reason"). */
  reason: string;
  /** The literal subject expected to be moving (e.g. "the espresso stream and rising steam", "the model's hair and fabric") — null when recommendation is REMOTION_ONLY. */
  motionSubject: string | null;
  /** The single most important physical motion this scene should show. */
  primaryAction: string | null;
  /** Additional physical motions that reinforce the primary one without competing for attention. */
  secondaryActions: string[];
  /** Ambient/environmental motion independent of the main subject (steam, dust, light shifting, background activity). */
  environmentalMotion: string | null;
  /** How the camera itself should (or should not) move — explicitly separate from physical motion so a scene can combine both without camera motion substituting for real content motion (Requirement 4). */
  cameraMotion: string | null;
  intensity: SceneMotionIntensity | null;
  /** 0-1: how much photorealistic fidelity matters here versus stylization — informational, folded into the prompt's tone. */
  realismPriority: number | null;
  /** True when the product/subject's exact appearance (shape, color, label, logo) must not visibly change/warp during motion. */
  preserveProductIdentity: boolean;
  /** Things the generated video must NOT do (Requirement 4: never let Ken-Burns-style whole-image pan/zoom stand in for real content motion). */
  negativeConstraints: string[];
  /** The exact, motion-first text sent to the video-generation provider — never a redescription of the still image's appearance. Null when recommendation is REMOTION_ONLY. */
  runwayPrompt: string | null;
};

/** The subset of VideoPlan the director actually needs — narrowed so tests never construct a full plan just to exercise prompt-building, mirroring lib/visuals/types.ts's VisualPlanningPlan. */
export type VideoDirectorPlan = Pick<
  VideoPlan,
  "business" | "objective" | "targetAudience" | "tone" | "cta" | "visualStyle" | "language" | "aspectRatio" | "durationSeconds" | "scenes"
>;
