import type { PlannedScene } from "@/lib/ai/video-plan-schema";
import type { OpenAiImageSize } from "@/lib/visuals/visual-config";
import { OPENAI_IMAGE_SIZES } from "@/lib/visuals/visual-config";
import type { VisualPlanningPlan } from "@/lib/visuals/types";

/** Picks the closest provider-supported image size for a plan's aspect ratio (Requirement 5: aspect-ratio-aware prompts). */
export function pickImageSize(aspectRatio: VisualPlanningPlan["aspectRatio"]): OpenAiImageSize {
  if (aspectRatio === "9:16") return OPENAI_IMAGE_SIZES.portrait;
  if (aspectRatio === "16:9") return OPENAI_IMAGE_SIZES.landscape;
  return OPENAI_IMAGE_SIZES.square;
}

/**
 * Builds one scene's commercial-quality image-generation prompt (Requirement
 * 5), folding in the plan-level visualTheme (Requirement 6: one coherent
 * campaign, not five random photos) so every auto-generated image in a
 * video shares the same lighting/mood/photography style/color temperature.
 * Callers only invoke this for a scene whose visual plan actually calls for
 * a generated image (see visual-planning.ts) — falls back to the scene's
 * own free-text `visualDirection` when the AI didn't give a concrete
 * `visual.subject`, so a scene can still get a reasonable prompt even from
 * an older-shaped plan.
 *
 * The "no text in the image" instruction is unconditional, not just for
 * Arabic — Requirement 5 explicitly calls out that Arabic visuals don't
 * need embedded Arabic writing, but the underlying rule (MOVO overlays its
 * own text) applies to every language.
 */
export function buildSceneVisualPrompt(plan: VisualPlanningPlan, scene: PlannedScene): string {
  const subject = scene.visual?.subject?.trim() || scene.visualDirection.trim();
  const theme = plan.visualTheme;

  const parts = [
    `Commercial advertising photograph: ${subject}.`,
    `Business: ${plan.business}.`,
    plan.cta ? `Offer/CTA context: ${plan.cta}.` : "",
    `Mood and tone: ${plan.tone}.`,
    `Target audience: ${plan.targetAudience}.`,
    theme
      ? `Photography style: ${theme.photographyStyle}. Lighting: ${theme.lighting}. Color temperature: ${theme.colorTemperature}.`
      : `Visual style: ${plan.visualStyle}.`,
    "Professional product/lifestyle advertising photography, high production value, sharp focus, realistic, commercial quality.",
    "Absolutely no text, letters, words, numbers, logos, watermarks, or writing of any kind anywhere in the image.",
  ].filter((part) => part.length > 0);

  return parts.join(" ");
}

/**
 * Normalizes a prompt into a stable dedup key (Requirement 12: reuse
 * visuals intelligently instead of generating one image per scene) —
 * two scenes whose resolved prompts are near-identical after
 * case/whitespace normalization are treated as "the same visual need"
 * rather than triggering a second paid generation call.
 */
export function visualPromptDedupeKey(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, " ");
}
