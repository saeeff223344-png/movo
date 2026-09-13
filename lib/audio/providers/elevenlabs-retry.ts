/**
 * ElevenLabs-specific retry/backoff policy, kept separate from
 * elevenlabs-tts-provider.ts (which has `import "server-only"` and makes a
 * real `fetch` call) purely so this — the part actually worth unit-testing —
 * never needs "server-only" or a real network call. Mirrors why
 * ../tts-fallback.ts and ../plan-narration.ts are already split the same
 * way from their "server-only" callers.
 *
 * Why this exists: MOVO's real integrated test synthesized 5 scenes'
 * narration concurrently and found 2 of them tripped ElevenLabs' Starter
 * plan concurrency/rate limit, silently falling through to the OpenAI
 * fallback mid-video — an Arabic ad should never mix Haytham and a generic
 * OpenAI voice just because of a transient limit. The fix has two halves:
 * ../plan-narration.ts now synthesizes scenes one at a time instead of via
 * Promise.all (so MOVO itself never opens more than one ElevenLabs request
 * at once), and this module gives a single ElevenLabs call a small bounded
 * chance to recover from a transient rejection before the provider gives up
 * and the existing OpenAI/silent fallback chain (../tts-fallback.ts) takes
 * over — reliability over raw speed, and only for the errors retrying can
 * actually fix.
 */

/**
 * HTTP statuses that represent a transient condition worth retrying: 429
 * (rate limit / concurrency limit exceeded — the exact failure mode seen in
 * the real test) and any 5xx (a transient server-side hiccup). Every other
 * status — 401/403 (invalid API key), 400/404/422 (invalid voice id, bad
 * request, unsupported configuration) — is permanent: retrying it would
 * only waste the bounded retry budget and delay the same eventual failure,
 * so those must throw immediately instead and let the fallback chain move
 * on right away.
 */
export function isRetryableElevenLabsStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

export type ElevenLabsAttemptResult<T> = { ok: true; value: T } | { ok: false; status: number; error: Error };

export type ElevenLabsRetryOptions = {
  /** Total attempts including the first — e.g. 3 means "1 try + up to 2 retries". */
  maxAttempts: number;
  /** Base delay for exponential backoff: attempt N waits baseDelayMs * 2^N before retrying. */
  baseDelayMs: number;
  /** Injectable purely for tests — production uses a real setTimeout-based sleep. */
  sleep?: (ms: number) => Promise<void>;
  isRetryable?: (status: number) => boolean;
};

const REAL_SLEEP = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs `attempt` up to `maxAttempts` times. Retries only when the attempt
 * reports a retryable status (see isRetryableElevenLabsStatus) AND attempts
 * remain; a permanent failure or the final attempt throws immediately, so a
 * single ElevenLabsTtsProvider.synthesize() call still resolves or rejects
 * exactly like before to every existing caller (../tts-fallback.ts needs no
 * changes) — this only changes how long one call takes before it does.
 */
export async function withElevenLabsRetry<T>(
  attempt: () => Promise<ElevenLabsAttemptResult<T>>,
  { maxAttempts, baseDelayMs, sleep = REAL_SLEEP, isRetryable = isRetryableElevenLabsStatus }: ElevenLabsRetryOptions,
): Promise<T> {
  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex++) {
    const result = await attempt();
    if (result.ok) return result.value;

    const isLastAttempt = attemptIndex === maxAttempts - 1;
    if (isLastAttempt || !isRetryable(result.status)) throw result.error;

    await sleep(baseDelayMs * 2 ** attemptIndex);
  }

  // Unreachable (the loop above always returns or throws), but keeps this an
  // expression-typed function for TypeScript's control-flow analysis.
  throw new Error("withElevenLabsRetry: exhausted attempts without a result.");
}
