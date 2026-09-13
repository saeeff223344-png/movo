import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import { createOpenAIClient, getOpenAIModel, OPENAI_REQUEST_TIMEOUT_MS } from "@/lib/ai/openai-client";
import { videoPlanSchema, type VideoPlan } from "@/lib/ai/video-plan-schema";
import { buildPlannerInstructions, buildPlannerUserInput, EmptyPromptError } from "@/lib/ai/prompt-builder";
import { mapIncompleteReason, mapOpenAIError, type PlannerErrorCode } from "@/lib/ai/planner-errors";
import type { GenerationSettings } from "@/lib/types/video";

export type { PlannerErrorCode } from "@/lib/ai/planner-errors";

export type GenerateVideoPlanResult = { ok: true; plan: VideoPlan } | { ok: false; code: PlannerErrorCode };

/**
 * Turns a user's free-text brief into a validated VideoPlan via the OpenAI
 * Responses API + Structured Outputs (lib/ai/video-plan-schema.ts is the
 * schema). Never throws — every failure path (missing key, network error,
 * timeout, refusal, malformed output) resolves to a typed error code; no
 * raw provider error text, stack trace, or secret ever leaves this function.
 * The caller (lib/actions/video-plan-actions.ts) is responsible for auth.
 */
export async function generateVideoPlan(prompt: string, settings: GenerationSettings): Promise<GenerateVideoPlanResult> {
  let userInput: string;
  try {
    userInput = buildPlannerUserInput(prompt);
  } catch (error) {
    if (error instanceof EmptyPromptError) return { ok: false, code: "empty_prompt" };
    throw error;
  }

  let client;
  try {
    client = createOpenAIClient();
  } catch {
    return { ok: false, code: "missing_api_key" };
  }

  try {
    const response = await client.responses.parse(
      {
        model: getOpenAIModel(),
        instructions: buildPlannerInstructions(settings),
        input: userInput,
        text: { format: zodTextFormat(videoPlanSchema, "video_plan") },
      },
      { timeout: OPENAI_REQUEST_TIMEOUT_MS },
    );

    if (response.status === "incomplete") {
      return { ok: false, code: mapIncompleteReason(response.incomplete_details?.reason) };
    }

    if (response.status !== "completed") {
      console.error("[video-planner] unexpected response status:", response.status, response.error?.code);
      return { ok: false, code: "unavailable" };
    }

    if (!response.output_parsed) {
      return { ok: false, code: "refused" };
    }

    const validated = videoPlanSchema.safeParse(response.output_parsed);
    if (!validated.success) {
      console.error("[video-planner] structured output failed re-validation:", validated.error.issues);
      return { ok: false, code: "invalid_output" };
    }

    return { ok: true, plan: validated.data };
  } catch (error) {
    const code = mapOpenAIError(error);
    console.error("[video-planner] OpenAI request failed:", code, error instanceof Error ? error.message : error);
    return { ok: false, code };
  }
}
