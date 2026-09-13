import "server-only";
import type { GenerateVideoInput, GenerateVideoResult } from "@/lib/video-generation/types";
import { runRunwayGeneration, type SubmitTaskFn, type PollTaskFn, type DownloadVideoFn } from "./runway-video-provider";

/**
 * The real, server-only network wiring behind runway-video-provider.ts's
 * pure orchestrator — the only file in this feature that actually calls
 * `fetch` against Runway or reads RUNWAYML_API_SECRET. Never imported by
 * anything except lib/actions/video-direction-actions.ts, exactly like
 * lib/visuals/providers/openai-image-provider.ts is the only caller of
 * OPENAI_API_KEY for image generation.
 */

const RUNWAY_BASE = "https://api.dev.runwayml.com";
const RUNWAY_VERSION = "2024-11-06";
const MODEL = "gen4_turbo";
/** Only retries a submission that never received an HTTP response at all (a thrown fetch error) — a real response, even an error one, is never retried, since the request could already have been accepted/billed server-side (Requirement 8). */
const SUBMIT_NETWORK_RETRY_ATTEMPTS = 2;

export function requireRunwayApiKey(): string {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) {
    throw new Error("RUNWAYML_API_SECRET is not set — see .env.example.");
  }
  return apiKey;
}

const realSubmitTask: SubmitTaskFn = async ({ apiKey, imageDataUrl, motionPrompt, ratio, durationSeconds }) => {
  const headers = { Authorization: `Bearer ${apiKey}`, "X-Runway-Version": RUNWAY_VERSION, "Content-Type": "application/json" };
  const body = JSON.stringify({ model: MODEL, promptImage: imageDataUrl, promptText: motionPrompt, ratio, duration: durationSeconds });

  let lastNetworkError = "Unknown network error";
  for (let attempt = 0; attempt < SUBMIT_NETWORK_RETRY_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${RUNWAY_BASE}/v1/image_to_video`, { method: "POST", headers, body });
    } catch (error) {
      lastNetworkError = error instanceof Error ? error.message : "Network error";
      continue;
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, error: data?.error ? String(data.error) : `Runway request failed (${response.status})` };
    }
    return { ok: true, id: data.id, estimatedCredits: data.estimatedCost?.credits ?? null };
  }
  return { ok: false, error: `Runway request failed after retries: ${lastNetworkError}` };
};

const realPollTask: PollTaskFn = async (apiKey, taskId) => {
  const headers = { Authorization: `Bearer ${apiKey}`, "X-Runway-Version": RUNWAY_VERSION };
  try {
    const response = await fetch(`${RUNWAY_BASE}/v1/tasks/${taskId}`, { headers });
    if (!response.ok) return { status: "PENDING" }; // transient poll error — a read-only retry, bounded by maxPollAttempts
    const data = await response.json();
    if (data.status === "SUCCEEDED") return { status: "SUCCEEDED", outputUrl: data.output[0], credits: data.cost?.credits ?? null };
    if (data.status === "FAILED" || data.status === "CANCELLED") {
      return { status: "FAILED", error: data.failure ? String(data.failure) : `Runway task ${data.status}`, credits: data.cost?.credits ?? null };
    }
    return { status: "PENDING" };
  } catch {
    return { status: "PENDING" };
  }
};

const realDownloadVideo: DownloadVideoFn = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download the generated video (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
};

export async function generateRunwayVideo(input: GenerateVideoInput): Promise<GenerateVideoResult> {
  let apiKey: string;
  try {
    apiKey = requireRunwayApiKey();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Runway is not configured." };
  }

  return runRunwayGeneration(input, apiKey, { submitTask: realSubmitTask, pollTask: realPollTask, downloadVideo: realDownloadVideo });
}
