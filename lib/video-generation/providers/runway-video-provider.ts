import type { GenerateVideoInput, GenerateVideoResult } from "@/lib/video-generation/types";
import { toRunwayRatio } from "./runway-aspect-ratio";

/**
 * Dynamic AI Video Director + Runway Integration phase — Runway Gen-4
 * Turbo image-to-video, split the same way every other real-provider file
 * in this codebase is (lib/audio/plan-narration.ts vs narration-actions.ts,
 * lib/visuals/visual-planning.ts vs visual-actions.ts): a pure, fully
 * unit-testable orchestrator (`runRunwayGeneration`, this file) that takes
 * every network call as an injected function, and — in
 * runway-video-provider-real.ts — the actual `fetch`-based wiring plus the
 * real, server-only API key. Verified against Runway's own OpenAPI spec
 * (https://docs.dev.runwayml.com/openapi.json) during the earlier
 * standalone test: POST /v1/image_to_video (model, promptImage, promptText,
 * ratio, duration) returns `{ id, estimatedCost: { credits } }`; GET
 * /v1/tasks/{id} is polled until a terminal status, returning `{ output:
 * [url], cost: { credits } }` on SUCCEEDED.
 */

export type RunwaySubmitInput = { apiKey: string; imageDataUrl: string; motionPrompt: string; ratio: string; durationSeconds: number };
export type RunwaySubmitResult = { ok: true; id: string; estimatedCredits: number | null } | { ok: false; error: string };

export type RunwayPollResult =
  | { status: "SUCCEEDED"; outputUrl: string; credits: number | null }
  | { status: "FAILED"; error: string; credits: number | null }
  | { status: "PENDING" };

export type SubmitTaskFn = (input: RunwaySubmitInput) => Promise<RunwaySubmitResult>;
export type PollTaskFn = (apiKey: string, taskId: string) => Promise<RunwayPollResult>;
export type DownloadVideoFn = (url: string) => Promise<Buffer>;

const MODEL = "gen4_turbo";
/** 36 attempts * 5s delay = 3 minutes — bounded so a stuck/slow Runway task can never hang the caller indefinitely (Requirement 8: "handle ... timeouts"). Gen-4 Turbo 5s clips typically finish in well under a minute in practice (the standalone test succeeded in ~30-40s). */
const DEFAULT_MAX_POLL_ATTEMPTS = 36;
const DEFAULT_POLL_DELAY_MS = 5000;

/**
 * Requirement 8: "NEVER silently issue another paid generation after a
 * generation failure without explicit policy" — this function submits
 * EXACTLY ONE task (network-level submit retries live inside the real
 * `submitTask` implementation, gated on never having received an HTTP
 * response yet — see runway-video-provider-real.ts) and polls it to a
 * terminal state. On FAILED or a poll timeout, it returns a plain error —
 * it never resubmits a new task itself. Any retry-after-failure is a
 * decision for the caller (lib/actions/video-direction-actions.ts), which
 * today makes none: one direction, one generation attempt, fall back to
 * the still image on any failure.
 */
export async function runRunwayGeneration(
  input: GenerateVideoInput,
  apiKey: string,
  deps: {
    submitTask: SubmitTaskFn;
    pollTask: PollTaskFn;
    downloadVideo: DownloadVideoFn;
    maxPollAttempts?: number;
    pollDelayMs?: number;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<GenerateVideoResult> {
  const maxPollAttempts = deps.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;
  const pollDelayMs = deps.pollDelayMs ?? DEFAULT_POLL_DELAY_MS;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  const submitted = await deps.submitTask({
    apiKey,
    imageDataUrl: input.imageDataUrl,
    motionPrompt: input.motionPrompt,
    ratio: toRunwayRatio(input.aspectRatio),
    durationSeconds: input.durationSeconds,
  });
  if (!submitted.ok) return { ok: false, error: submitted.error };

  for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
    await sleep(pollDelayMs);
    const polled = await deps.pollTask(apiKey, submitted.id);

    if (polled.status === "SUCCEEDED") {
      try {
        const buffer = await deps.downloadVideo(polled.outputUrl);
        return {
          ok: true,
          dataUrl: `data:video/mp4;base64,${buffer.toString("base64")}`,
          provider: `runway:${MODEL}`,
          model: MODEL,
          providerTaskId: submitted.id,
          durationSeconds: input.durationSeconds,
          providerCost: polled.credits,
        };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Failed to download the generated video.", providerTaskId: submitted.id };
      }
    }

    if (polled.status === "FAILED") {
      return { ok: false, error: polled.error, providerTaskId: submitted.id };
    }
    // PENDING (includes THROTTLED/RUNNING from the real poller) -> keep polling.
  }

  return { ok: false, error: "Timed out waiting for the Runway task to complete.", providerTaskId: submitted.id };
}
