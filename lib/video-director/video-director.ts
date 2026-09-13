import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import { createOpenAIClient, getOpenAIModel, OPENAI_REQUEST_TIMEOUT_MS } from "@/lib/ai/openai-client";
import { videoDirectorOutputSchema } from "./motion-direction-schema";
import { buildVideoDirectorInstructions, buildVideoDirectorInput, type DirectorSceneInput } from "./prompt-builder";
import { isSceneCandidateForVideoDirection } from "./eligibility";
import type { SceneMotionDirection, VideoDirectorPlan } from "./types";

export type DirectSceneMotionResult = { ok: true; directions: SceneMotionDirection[] } | { ok: false; error: string };

/**
 * Dynamic AI Video Director phase — the real, server-only OpenAI call
 * (Requirement 2). Mirrors lib/ai/video-planner.ts's own Structured
 * Outputs pattern exactly: one bounded-timeout `responses.parse` call,
 * every failure path (missing key, network error, timeout, refusal,
 * malformed output) resolves to a typed `{ ok: false, error }` rather
 * than throwing, so a director outage can never break an already-
 * generated VideoPlan — the caller (lib/actions/video-direction-actions.ts)
 * falls back to "every candidate scene stays REMOTION_ONLY" on failure.
 *
 * Only scenes that pass `isSceneCandidateForVideoDirection` (eligibility.ts)
 * are even sent to the model — a scene with no resolved still visual has
 * nothing to animate, and a scene whose purpose is always-typography
 * (price/discount/logo) has an obvious answer not worth spending tokens
 * reasoning about. Returns `{ ok: true, directions: [] }` (never an error)
 * when there are no candidates at all.
 */
export async function directSceneMotion(plan: VideoDirectorPlan, hasResolvedVisual: (sceneId: string) => boolean): Promise<DirectSceneMotionResult> {
  const candidates: DirectorSceneInput[] = plan.scenes
    .map((scene, index) => ({ scene, index }))
    .filter(({ scene }) => isSceneCandidateForVideoDirection(scene.purpose, hasResolvedVisual(scene.id)))
    .map(({ scene, index }) => ({
      id: scene.id,
      purpose: scene.purpose,
      visualDirection: scene.visualDirection,
      narration: scene.narration,
      onScreenText: scene.onScreenText,
      motionDirection: scene.motionDirection,
      visualSubject: scene.visual?.subject ?? null,
      order: index,
      totalScenes: plan.scenes.length,
    }));

  if (candidates.length === 0) return { ok: true, directions: [] };

  let client;
  try {
    client = createOpenAIClient();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "OpenAI is not configured." };
  }

  try {
    const response = await client.responses.parse(
      {
        model: getOpenAIModel(),
        instructions: buildVideoDirectorInstructions(plan),
        input: buildVideoDirectorInput(candidates),
        text: { format: zodTextFormat(videoDirectorOutputSchema, "video_director") },
      },
      { timeout: OPENAI_REQUEST_TIMEOUT_MS },
    );

    if (response.status !== "completed" || !response.output_parsed) {
      return { ok: false, error: `Video director response was not usable (status: ${response.status}).` };
    }

    return { ok: true, directions: response.output_parsed.scenes };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Video director call failed." };
  }
}
