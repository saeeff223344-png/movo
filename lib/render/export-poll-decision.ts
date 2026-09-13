/**
 * Decides what ExportPanel.tsx's poll loop should do with one
 * checkExportProgressAction result, given how many CONSECUTIVE transient
 * (query/network) failures have already happened in a row.
 *
 * The production bug this exists to prevent: a SINGLE transient Supabase
 * read error during a long-running (10+ minute) poll loop previously
 * looked indistinguishable from "the render job doesn't exist," which
 * hard-failed the whole export and permanently stopped polling — even
 * though the underlying AWS Lambda render was very often still genuinely
 * running (confirmed in production: a render_jobs row was found sitting at
 * `status: 'processing'`, unmoving, well after the client had given up).
 *
 * Deliberately free of any import — including from
 * lib/render/export-orchestration.ts, which this mirrors structurally
 * rather than importing from — so it's safe to import directly into a
 * "use client" component (ExportPanel.tsx) and independently unit-testable
 * with zero risk of pulling server-only code into the client bundle,
 * exactly like lib/download/video-download.ts.
 */

/** Structurally mirrors export-orchestration.ts's CheckExportProgressResult — ExportPanel.tsx passes checkExportProgressAction's real result straight through; TypeScript accepts it structurally with no cast needed. */
export type PollResult =
  | { ok: true; status: "queued" | "processing"; progress: number }
  | { ok: true; status: "succeeded"; downloadUrl: string }
  | { ok: true; status: "failed"; error: string }
  | { ok: false; error: string; transient: boolean };

export type PollDecision =
  /** A transient failure that hasn't hit the threshold yet — the caller must keep polling, keep activeJobId untouched, and must not mutate any render state at all for this cycle. */
  | { action: "retry-silently"; consecutiveTransientFailures: number }
  /** Either a non-transient failure, or a transient one that has now failed `threshold` times in a row — give up, matching the pre-fix hard-failure behavior exactly. */
  | { action: "hard-fail"; error: string }
  | { action: "update-rendering"; progress: number }
  | { action: "completed"; downloadUrl: string }
  | { action: "render-failed"; error: string };

/** Up to 3 silent retries; the 4th consecutive transient failure in a row gives up — within the task's requested 3-5 range. */
export const DEFAULT_TRANSIENT_FAILURE_THRESHOLD = 4;

/**
 * `consecutiveTransientFailures` is the count BEFORE this result — the
 * caller owns tracking it across polls (a plain counter in the poll
 * effect's closure, not React state — see ExportPanel.tsx) and must reset
 * it to 0 after any decision other than "retry-silently".
 */
export function decidePollAction(
  result: PollResult,
  consecutiveTransientFailures: number,
  threshold: number = DEFAULT_TRANSIENT_FAILURE_THRESHOLD,
): PollDecision {
  if (!result.ok) {
    if (result.transient) {
      const next = consecutiveTransientFailures + 1;
      if (next < threshold) return { action: "retry-silently", consecutiveTransientFailures: next };
    }
    return { action: "hard-fail", error: result.error };
  }
  if (result.status === "succeeded") return { action: "completed", downloadUrl: result.downloadUrl };
  if (result.status === "failed") return { action: "render-failed", error: result.error };
  return { action: "update-rendering", progress: result.progress };
}
