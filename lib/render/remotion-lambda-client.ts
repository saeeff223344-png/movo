import "server-only";
import { renderMediaOnLambda, getRenderProgress, type AwsRegion } from "@remotion/lambda/client";
import type { RenderClient, StartRenderInput, StartRenderResult, RenderProgressResult } from "./render-client";

/**
 * MOVO's chosen render backend: Remotion Lambda (AWS). Rendering even a
 * short 1080p video with headless Chromium reliably takes well past
 * Vercel's serverless function time limits (Hobby's default is 10s, and
 * even an extended limit is not a safe bet for a real render) — Remotion
 * Lambda exists specifically for this: a managed, pay-per-render AWS Lambda
 * function that does the actual rendering, invoked from a normal fast
 * server action here and polled for progress separately (see
 * lib/actions/export-actions.ts), so nothing in the Next.js app itself ever
 * blocks on a render.
 *
 * Requires a ONE-TIME manual AWS setup this codebase cannot perform for
 * you (it needs a real AWS account/credentials, which must never be
 * generated or guessed on your behalf):
 *   1. An AWS account + an IAM user with the permissions
 *      `npx remotion lambda policies` documents.
 *   2. `npx remotion lambda functions deploy` — deploys the Lambda function
 *      that actually renders.
 *   3. `npx remotion lambda sites create` — bundles and uploads this
 *      Remotion project to S3, producing a `serveUrl`.
 *   4. Set these in `.env.local` (see .env.example):
 *      REMOTION_AWS_ACCESS_KEY_ID, REMOTION_AWS_SECRET_ACCESS_KEY,
 *      REMOTION_AWS_REGION, REMOTION_LAMBDA_FUNCTION_NAME,
 *      REMOTION_LAMBDA_SERVE_URL (the deploy commands above print the
 *      function name and serve URL).
 * Until all five are set, startRender/getRenderProgress return a clear
 * "not configured" error instead of throwing — exactly like
 * createOpenAIClient/createAdminClient/resolveElevenLabsVoiceId do for
 * their own required configuration elsewhere in this codebase.
 */

type LambdaConfig = { region: AwsRegion; functionName: string; serveUrl: string };

const NOT_CONFIGURED_ERROR =
  "Remotion Lambda isn't configured yet — set REMOTION_AWS_ACCESS_KEY_ID, REMOTION_AWS_SECRET_ACCESS_KEY, REMOTION_AWS_REGION, REMOTION_LAMBDA_FUNCTION_NAME, and REMOTION_LAMBDA_SERVE_URL (see .env.example).";

/**
 * Remotion Lambda splits a render into `ceil(totalFrames / framesPerLambda)`
 * chunks and renders them as SEPARATE CONCURRENT Lambda invocations —
 * Remotion's default (20) means even a short 10s@30fps MOVO ad (300 frames)
 * fans out to 15 simultaneous invocations. A brand-new AWS account's
 * default Lambda concurrent-execution quota is often well below that
 * (confirmed against this exact account: the first real export through the
 * live UI failed with "AWS Concurrency limit reached").
 *
 * 900 frames (30s @ 30fps) covers every duration MOVO's own UI actually
 * offers (lib/types/video.ts's VideoDuration caps its presets at 30s) in a
 * SINGLE chunk — i.e. one Lambda invocation, no concurrency at all for the
 * realistic common case. Only an "auto"-inferred plan longer than 30s (up
 * to video-plan-schema.ts's MAX_DURATION_SECONDS=90s, never user-selectable)
 * would ever need more than one concurrent invocation, and even then just
 * 2-3. Pairs with a longer function timeout (see functions.deploy's
 * --timeout) since a single chunk now renders its own frames sequentially
 * rather than fanning out — reliability over raw speed, same trade-off
 * already made for ElevenLabs narration serialization.
 */
const FRAMES_PER_LAMBDA = 900;

function readConfig(): LambdaConfig | null {
  const region = process.env.REMOTION_AWS_REGION as AwsRegion | undefined;
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
  const serveUrl = process.env.REMOTION_LAMBDA_SERVE_URL;
  // REMOTION_AWS_ACCESS_KEY_ID / REMOTION_AWS_SECRET_ACCESS_KEY are read
  // automatically by @remotion/lambda from process.env — never read or
  // passed explicitly here, so they're never at risk of being logged.
  if (!region || !functionName || !serveUrl || !process.env.REMOTION_AWS_ACCESS_KEY_ID || !process.env.REMOTION_AWS_SECRET_ACCESS_KEY) {
    return null;
  }
  return { region, functionName, serveUrl };
}

export class RemotionLambdaRenderClient implements RenderClient {
  async startRender(input: StartRenderInput): Promise<StartRenderResult> {
    const config = readConfig();
    if (!config) return { ok: false, error: NOT_CONFIGURED_ERROR };

    try {
      const result = await renderMediaOnLambda({
        region: config.region,
        functionName: config.functionName,
        serveUrl: config.serveUrl,
        composition: input.compositionId,
        inputProps: input.inputProps,
        codec: "h264",
        privacy: "private",
        framesPerLambda: FRAMES_PER_LAMBDA,
      });
      return { ok: true, renderId: result.renderId, bucketName: result.bucketName };
    } catch (error) {
      console.error("[remotion-lambda-client] startRender failed:", error);
      return { ok: false, error: error instanceof Error ? error.message : "Failed to start the render." };
    }
  }

  async getRenderProgress(renderId: string, bucketName: string): Promise<RenderProgressResult> {
    const config = readConfig();
    if (!config) return { ok: false, error: NOT_CONFIGURED_ERROR };

    try {
      const progress = await getRenderProgress({
        renderId,
        bucketName,
        functionName: config.functionName,
        region: config.region,
      });

      if (progress.fatalErrorEncountered) {
        return { ok: false, error: progress.errors[0]?.message ?? "The render failed." };
      }
      if (!progress.done || !progress.outputFile) {
        return { ok: true, done: false, progress: progress.overallProgress };
      }
      return { ok: true, done: true, downloadUrl: progress.outputFile };
    } catch (error) {
      console.error("[remotion-lambda-client] getRenderProgress failed:", error);
      return { ok: false, error: error instanceof Error ? error.message : "Failed to check render progress." };
    }
  }
}
