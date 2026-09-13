import "server-only";
import { createOpenAIClient } from "@/lib/ai/openai-client";
import { OPENAI_GPT_IMAGE_1_MEDIUM_RATE, estimateImageCostUsd } from "@/lib/visuals/visual-pricing";
import type { GenerateImageInput, GenerateImageResult } from "@/lib/visuals/types";

/**
 * Real, server-only visual provider (Automatic Visual Assets phase,
 * Requirement 4): "before integrating any paid provider, inspect whether
 * an existing OpenAI image capability is already available" — it is.
 * lib/ai/openai-client.ts already provides a server-only OpenAI client
 * (used today only for the text planner), and OPENAI_API_KEY is already a
 * required, already-configured secret for this project. No new paid
 * service/account is needed: this is the exact "implement it server-side
 * only using existing OpenAI infrastructure" path Requirement 4 asks for.
 *
 * "medium" quality (see lib/visuals/visual-pricing.ts) balances commercial
 * output quality against Requirement 12's cost-control mandate — "high"
 * costs meaningfully more per image with limited visible benefit at the
 * small on-screen size these visuals are ultimately composited at.
 *
 * Implements lib/visuals/types.ts's VisualProvider interface — the only
 * contract lib/visuals/visual-planning.ts's orchestrator depends on, so
 * swapping this for a stock-photo provider later never touches that file.
 */
const MODEL = "gpt-image-1";
const QUALITY = "medium" as const;

function nearestSupportedSize(width: number, height: number): "1024x1024" | "1024x1536" | "1536x1024" {
  if (width === height) return "1024x1024";
  return height > width ? "1024x1536" : "1536x1024";
}

export async function generateOpenAIImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  let client;
  try {
    client = createOpenAIClient();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "OpenAI is not configured." };
  }

  try {
    const response = await client.images.generate({
      model: MODEL,
      prompt: input.prompt,
      size: nearestSupportedSize(input.width, input.height),
      quality: QUALITY,
      n: 1,
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) return { ok: false, error: "OpenAI image generation returned no image data." };

    return {
      ok: true,
      dataUrl: `data:image/png;base64,${b64}`,
      provider: `openai:${MODEL}`,
      estimatedUsd: estimateImageCostUsd(1, OPENAI_GPT_IMAGE_1_MEDIUM_RATE),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "OpenAI image generation failed." };
  }
}
