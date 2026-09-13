import { APIConnectionError, APIConnectionTimeoutError, APIError, AuthenticationError, BadRequestError, RateLimitError } from "openai";

/**
 * Every way lib/ai/video-planner.ts's generateVideoPlan() can fail to
 * produce a plan. Deliberately provider-agnostic and stack-trace-free —
 * the server action (lib/actions/video-plan-actions.ts) sends only this
 * code to the browser, never the raw OpenAI error.
 */
export type PlannerErrorCode =
  | "empty_prompt"
  | "missing_api_key"
  | "timeout"
  | "rate_limited"
  | "invalid_output"
  | "refused"
  | "unavailable";

/** Maps an exception thrown by the OpenAI SDK call to a safe planner error code. */
export function mapOpenAIError(error: unknown): PlannerErrorCode {
  if (error instanceof APIConnectionTimeoutError) return "timeout";
  if (error instanceof RateLimitError) return "rate_limited";
  if (error instanceof AuthenticationError) return "missing_api_key";
  if (error instanceof APIConnectionError) return "unavailable";
  if (error instanceof BadRequestError) return "invalid_output";
  if (error instanceof APIError) return "unavailable";
  return "unavailable";
}

/** Maps a Responses API `incomplete_details.reason` to a safe planner error code. */
export function mapIncompleteReason(
  reason: "max_output_tokens" | "max_messages" | "content_filter" | "steered" | undefined,
): PlannerErrorCode {
  return reason === "content_filter" ? "refused" : "invalid_output";
}
