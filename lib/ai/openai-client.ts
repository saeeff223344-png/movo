import "server-only";
import OpenAI from "openai";

const DEFAULT_MODEL = "gpt-5.4-mini";

/** Per-request timeout passed to every planner call (lib/ai/video-planner.ts). */
export const OPENAI_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Server-only OpenAI client. `import "server-only"` makes an accidental
 * import from a Client Component a build error, on top of OPENAI_API_KEY
 * simply not existing in the browser bundle (it deliberately has no
 * NEXT_PUBLIC_ prefix) — mirrors lib/supabase/admin.ts's createAdminClient.
 */
export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set — see .env.example.");
  }
  return new OpenAI({ apiKey, timeout: OPENAI_REQUEST_TIMEOUT_MS });
}

/** OPENAI_MODEL overrides the default; falls back to gpt-5.4-mini when unset or blank. */
export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}
