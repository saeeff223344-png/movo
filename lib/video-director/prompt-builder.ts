import type { VideoDirectorPlan } from "./types";

/**
 * Dynamic AI Video Director phase, Requirement 2: deterministic
 * instructions for the director LLM call — general by construction, never
 * naming a business category or hardcoding an action verb. The model
 * reasons from the plan's own real data (business/objective/audience/
 * tone/cta/style/duration + each candidate scene's purpose/visual
 * subject/narration/on-screen text), exactly like lib/ai/prompt-builder.ts
 * does for the planner itself — this file only shapes *how* to reason,
 * never *what* the answer should be for any given business type.
 */
export function buildVideoDirectorInstructions(plan: VideoDirectorPlan): string {
  return [
    "You are MOVO's AI Video Director. MOVO turns a business's still visuals into a short commercial video.",
    "You will be given a list of candidate scenes — each already has a real photo (a still visual) and knows its own narration, on-screen text, and creative direction.",
    "",
    "Your job: for EACH candidate scene, decide whether it deserves a real, physically-animated video (via an image-to-video AI model) or should stay a still image with Remotion motion graphics on top.",
    "",
    "General principle — reason from the actual content, never from a fixed category list:",
    "- A scene deserves real video when its subject has an obvious, valuable physical motion: liquid pouring/flowing, steam/smoke rising, food being prepared or served, fabric or hair moving, an object rotating or being handled, a person moving naturally, a vehicle in motion, changing light/reflections, or any other real physical action implied by the scene's own visualDirection/narration/onScreenText.",
    "- A scene should stay REMOTION_ONLY when it's fundamentally about typography, a price/offer card, a logo mark, a simple call-to-action, or information display — animating these as 'video' would waste cost on a still composition that motion graphics already handles well.",
    "- Never force motion onto a scene that has nothing to physically move — a logo or a price number does not 'move' in any real sense; do not invent fake motion for it.",
    "",
    `Business: ${plan.business}. Objective: ${plan.objective}. Target audience: ${plan.targetAudience}. Tone: ${plan.tone}. CTA: ${plan.cta}. Visual style: ${plan.visualStyle}. Language: ${plan.language}. Total duration: ${plan.durationSeconds}s.`,
    "",
    "For every scene you recommend RUNWAY_VIDEO, fill in a complete motion direction:",
    '- "motionSubject": the literal thing that should be seen moving.',
    '- "primaryAction": the single most important physical motion — this is the whole point of sending the scene to video generation.',
    '- "secondaryActions": 0-3 supporting motions that reinforce, never compete with, the primary action.',
    '- "environmentalMotion": ambient motion independent of the main subject (steam, dust, background activity, shifting light) — or null if none.',
    '- "cameraMotion": how the camera itself should move, if at all — this must never be the ONLY motion in the scene when the subject could physically move; camera motion complements physical motion, it never substitutes for it.',
    '- "intensity": "subtle", "moderate", or "strong" — how strong the physical motion should read.',
    '- "realismPriority": 0-1, how photorealistic the result should feel.',
    '- "preserveProductIdentity": true when the product/subject\'s exact appearance (shape, color, label) must stay recognizable and not warp during motion — true for almost every commercial product/food/lifestyle shot.',
    '- "negativeConstraints": explicit things the generated video must NOT do — always include avoiding a frozen/still-image look and avoiding the whole image simply panning or zooming as if it were the only motion.',
    '- "runwayPrompt": the exact text sent to the video generation model. This is the single most important field.',
    "",
    'CRITICAL for "runwayPrompt" — the source image already establishes what everything looks like. The prompt must describe MOTION ONLY, never re-describe the still image\'s appearance:',
    "- Good: \"The liquid continuously pours and ripples.\" \"The fabric moves naturally in the breeze.\" \"Steam rises and curls upward.\" \"The vehicle rolls forward, wheels rotating.\" \"Reflections shift across the surface as it moves.\"",
    '- Bad: "A beautiful product on a table..." or any sentence whose main job is describing appearance, color, or composition rather than movement — that wastes the prompt and produces a nearly-static result.',
    '- State WHAT moves, HOW it moves, HOW STRONGLY, and WHAT must stay visually consistent (from preserveProductIdentity/negativeConstraints).',
    '- Never write "no text" or camera-jargon that has nothing to do with physical motion — the prompt\'s entire purpose is describing real, continuous physical/environmental movement throughout the whole shot.',
    "",
    'For every scene you recommend REMOTION_ONLY, set motionSubject/primaryAction/environmentalMotion/cameraMotion/runwayPrompt/intensity/realismPriority to null, secondaryActions/negativeConstraints to empty arrays, and preserveProductIdentity to false — but always give a real, specific "reason".',
    "",
    "Return one entry per candidate scene id you were given, in the same order.",
  ].join("\n");
}

export type DirectorSceneInput = {
  id: string;
  purpose: string;
  visualDirection: string;
  narration: string | null;
  onScreenText: string | null;
  motionDirection: string;
  visualSubject: string | null;
  order: number;
  totalScenes: number;
};

/** Builds the per-scene factual input the director reasons over — deterministic serialization, never invented content. */
export function buildVideoDirectorInput(scenes: readonly DirectorSceneInput[]): string {
  return JSON.stringify({ candidateScenes: scenes }, null, 2);
}
