import { describe, expect, it, vi } from "vitest";
import { withElevenLabsRetry, isRetryableElevenLabsStatus, type ElevenLabsAttemptResult } from "@/lib/audio/providers/elevenlabs-retry";

function ok<T>(value: T): ElevenLabsAttemptResult<T> {
  return { ok: true, value };
}

function fail(status: number, message = `failed with ${status}`): ElevenLabsAttemptResult<never> {
  return { ok: false, status, error: new Error(message) };
}

describe("isRetryableElevenLabsStatus", () => {
  it("treats 429 (rate limit / concurrency limit) as retryable", () => {
    expect(isRetryableElevenLabsStatus(429)).toBe(true);
  });

  it("treats every 5xx as retryable", () => {
    expect(isRetryableElevenLabsStatus(500)).toBe(true);
    expect(isRetryableElevenLabsStatus(502)).toBe(true);
    expect(isRetryableElevenLabsStatus(503)).toBe(true);
    expect(isRetryableElevenLabsStatus(599)).toBe(true);
  });

  it("treats invalid credentials, invalid voice, and bad requests as permanent (never retryable)", () => {
    expect(isRetryableElevenLabsStatus(401)).toBe(false);
    expect(isRetryableElevenLabsStatus(403)).toBe(false);
    expect(isRetryableElevenLabsStatus(400)).toBe(false);
    expect(isRetryableElevenLabsStatus(404)).toBe(false);
    expect(isRetryableElevenLabsStatus(422)).toBe(false);
  });
});

describe("withElevenLabsRetry", () => {
  it("returns the first attempt's value without retrying when it succeeds", async () => {
    const attempt = vi.fn(async () => ok("audio-bytes"));
    const sleep = vi.fn(async () => {});

    const result = await withElevenLabsRetry(attempt, { maxAttempts: 3, baseDelayMs: 400, sleep });

    expect(result).toBe("audio-bytes");
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("(retryable) retries a 429 rate/concurrency rejection and succeeds on the next attempt", async () => {
    const attempt = vi
      .fn<() => Promise<ElevenLabsAttemptResult<string>>>()
      .mockResolvedValueOnce(fail(429, "too_many_concurrent_requests"))
      .mockResolvedValueOnce(ok("audio-bytes"));
    const sleep = vi.fn(async () => {});

    const result = await withElevenLabsRetry(attempt, { maxAttempts: 3, baseDelayMs: 400, sleep });

    expect(result).toBe("audio-bytes");
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("backs off exponentially between retries (baseDelayMs * 2^attemptIndex)", async () => {
    const attempt = vi
      .fn<() => Promise<ElevenLabsAttemptResult<string>>>()
      .mockResolvedValueOnce(fail(429))
      .mockResolvedValueOnce(fail(503))
      .mockResolvedValueOnce(ok("audio-bytes"));
    const sleep = vi.fn(async () => {});

    await withElevenLabsRetry(attempt, { maxAttempts: 3, baseDelayMs: 400, sleep });

    expect(sleep).toHaveBeenNthCalledWith(1, 400); // 400 * 2^0
    expect(sleep).toHaveBeenNthCalledWith(2, 800); // 400 * 2^1
  });

  it("(bounded) gives up after maxAttempts and throws the last retryable error — never retries indefinitely", async () => {
    const attempt = vi.fn(async () => fail(429, "still rate limited"));
    const sleep = vi.fn(async () => {});

    await expect(withElevenLabsRetry(attempt, { maxAttempts: 3, baseDelayMs: 10, sleep })).rejects.toThrow("still rate limited");
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2); // only between attempts, never after the last
  });

  it("(permanent) throws immediately on invalid credentials without retrying or sleeping at all", async () => {
    const attempt = vi.fn(async () => fail(401, "invalid_api_key"));
    const sleep = vi.fn(async () => {});

    await expect(withElevenLabsRetry(attempt, { maxAttempts: 3, baseDelayMs: 400, sleep })).rejects.toThrow("invalid_api_key");
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("(permanent) throws immediately on an invalid voice / bad request without retrying", async () => {
    const attempt = vi.fn(async () => fail(400, "invalid voice_id"));
    const sleep = vi.fn(async () => {});

    await expect(withElevenLabsRetry(attempt, { maxAttempts: 3, baseDelayMs: 400, sleep })).rejects.toThrow("invalid voice_id");
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("never makes more paid attempts than maxAttempts, even under repeated retryable failures", async () => {
    const attempt = vi.fn(async () => fail(500));
    await expect(withElevenLabsRetry(attempt, { maxAttempts: 2, baseDelayMs: 1, sleep: async () => {} })).rejects.toThrow();
    expect(attempt.mock.calls.length).toBe(2);
  });

  it("supports a custom isRetryable predicate", async () => {
    const attempt = vi
      .fn<() => Promise<ElevenLabsAttemptResult<string>>>()
      .mockResolvedValueOnce(fail(418, "teapot"))
      .mockResolvedValueOnce(ok("recovered"));

    const result = await withElevenLabsRetry(attempt, {
      maxAttempts: 3,
      baseDelayMs: 1,
      sleep: async () => {},
      isRetryable: (status) => status === 418,
    });

    expect(result).toBe("recovered");
  });
});
