import { describe, expect, it } from "vitest";
import { decidePollAction, DEFAULT_TRANSIENT_FAILURE_THRESHOLD, type PollResult } from "@/lib/render/export-poll-decision";

describe("decidePollAction", () => {
  it("(one transient failure does not stop the render) retries silently on the first transient failure, never hard-failing", () => {
    const result: PollResult = { ok: false, error: "fetch failed", transient: true };
    const decision = decidePollAction(result, 0);
    expect(decision).toEqual({ action: "retry-silently", consecutiveTransientFailures: 1 });
  });

  it("(several transient failures are retried before hard failure) keeps retrying below the threshold, hard-fails only once the threshold is reached", () => {
    const result: PollResult = { ok: false, error: "fetch failed", transient: true };
    // Default threshold is 4: failures 1-3 retry silently, failure 4 gives up.
    expect(decidePollAction(result, 0)).toEqual({ action: "retry-silently", consecutiveTransientFailures: 1 });
    expect(decidePollAction(result, 1)).toEqual({ action: "retry-silently", consecutiveTransientFailures: 2 });
    expect(decidePollAction(result, 2)).toEqual({ action: "retry-silently", consecutiveTransientFailures: 3 });
    expect(decidePollAction(result, 3)).toEqual({ action: "hard-fail", error: "fetch failed" });
  });

  it("respects a custom threshold within the requested 3-5 range", () => {
    const result: PollResult = { ok: false, error: "fetch failed", transient: true };
    expect(decidePollAction(result, 1, 3)).toEqual({ action: "retry-silently", consecutiveTransientFailures: 2 });
    expect(decidePollAction(result, 2, 3)).toEqual({ action: "hard-fail", error: "fetch failed" });
    expect(decidePollAction(result, 3, 5)).toEqual({ action: "retry-silently", consecutiveTransientFailures: 4 });
    expect(decidePollAction(result, 4, 5)).toEqual({ action: "hard-fail", error: "fetch failed" });
  });

  it("(true missing job still returns not found) a non-transient failure hard-fails immediately, even on the very first attempt", () => {
    const result: PollResult = { ok: false, error: "Render job not found.", transient: false };
    expect(decidePollAction(result, 0)).toEqual({ action: "hard-fail", error: "Render job not found." });
  });

  it("(a successful poll after a transient failure recovers normally) a normal 'processing' result is reported as update-rendering, regardless of prior transient failures", () => {
    const result: PollResult = { ok: true, status: "processing", progress: 0.42 };
    expect(decidePollAction(result, 3)).toEqual({ action: "update-rendering", progress: 0.42 });
  });

  it("reports a succeeded render as completed", () => {
    const result: PollResult = { ok: true, status: "succeeded", downloadUrl: "https://storage.example/signed" };
    expect(decidePollAction(result, 0)).toEqual({ action: "completed", downloadUrl: "https://storage.example/signed" });
  });

  it("(real failed render still fails normally) a genuine render failure (ok:true, status:'failed') is reported as render-failed, not retried", () => {
    const result: PollResult = { ok: true, status: "failed", error: "The render failed." };
    expect(decidePollAction(result, 0)).toEqual({ action: "render-failed", error: "The render failed." });
  });

  it("the default threshold is within the requested 3-5 range", () => {
    expect(DEFAULT_TRANSIENT_FAILURE_THRESHOLD).toBeGreaterThanOrEqual(3);
    expect(DEFAULT_TRANSIENT_FAILURE_THRESHOLD).toBeLessThanOrEqual(5);
  });
});
