"use client";

import { useEffect, useState } from "react";
import { Download, Lock, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import {
  checkExportProgressAction,
  getLatestCompletedExportAction,
  getActiveExportAction,
  type StartExportResult,
} from "@/lib/actions/export-actions";
import { DownloadVideoButton } from "@/components/create/DownloadVideoButton";
import { decidePollAction } from "@/lib/render/export-poll-decision";

type ExportUiState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "rendering"; progress: number }
  | { phase: "completed"; downloadUrl: string; renderJobId: string }
  | { phase: "failed"; error: string };

const POLL_INTERVAL_MS = 3000;

/**
 * Real 1080p MP4 export control — replaces the earlier "coming soon" modal.
 * `onExport` is provided by ResultView: it saves any pending editor changes
 * first, then calls lib/actions/export-actions.ts's startExportAction, so
 * this component never needs to know about save timing or the VideoPlan
 * itself. Once a render job exists, polls checkExportProgressAction every
 * few seconds — the "smallest viable" progress mechanism for a launch with
 * no background worker/queue infrastructure — until it reaches a terminal
 * state (completed/failed).
 */
export function ExportPanel({ projectId, onExport }: { projectId: string | null; onExport: () => Promise<StartExportResult> }) {
  const { t } = useI18n();
  const [state, setState] = useState<ExportUiState>({ phase: "idle" });
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeJobId) return;
    let cancelled = false;
    // A plain closure variable, not React state: it only needs to survive
    // between poll ticks within this one effect run (reset whenever
    // activeJobId itself changes, which is correct — a new job starts
    // fresh), and never needs to trigger a re-render on its own.
    let consecutiveTransientFailures = 0;

    async function poll() {
      const result = await checkExportProgressAction(activeJobId as string);
      if (cancelled) return;

      const decision = decidePollAction(result, consecutiveTransientFailures);
      switch (decision.action) {
        case "retry-silently":
          // A single transient Supabase/query error — the render's real
          // status is simply unknown for this one poll, not confirmed
          // missing. Keep activeJobId and the current render state exactly
          // as they are; the next interval tick retries automatically.
          // This never starts a new render and never duplicates the
          // existing job — it's a pure re-read of the same job id.
          consecutiveTransientFailures = decision.consecutiveTransientFailures;
          return;
        case "hard-fail":
          setState({ phase: "failed", error: decision.error });
          setActiveJobId(null);
          return;
        case "update-rendering":
          consecutiveTransientFailures = 0;
          setState({ phase: "rendering", progress: decision.progress });
          return;
        case "completed":
          consecutiveTransientFailures = 0;
          setState({ phase: "completed", downloadUrl: decision.downloadUrl, renderJobId: activeJobId as string });
          setActiveJobId(null);
          return;
        case "render-failed":
          consecutiveTransientFailures = 0;
          setState({ phase: "failed", error: decision.error });
          setActiveJobId(null);
          return;
      }
    }

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeJobId]);

  // Reopening/reloading a project: check once whether it already has (a) a
  // real, still-running export to RESUME tracking, or (b) a real, completed
  // export to offer for download — either way so the user is never tempted
  // into starting (and paying for) a brand-new Remotion Lambda render of
  // something that already exists or is already in progress. "Active"
  // takes priority over "completed" (a project can have both an older
  // finished export and a newer one currently rendering; the newer one is
  // what the user cares about). Both functional setState/setActiveJobId
  // calls guard against a race with a fresh export the user explicitly
  // starts in the same window: they only ever apply to a still-"idle"
  // panel / a not-yet-set activeJobId, never clobbering a live
  // "starting"/"rendering"/"completed"/"failed" state. Neither lookup ever
  // calls startRender — see lib/render/export-orchestration.ts's
  // findActiveExport/findLatestCompletedExport docstrings — so resuming or
  // rehydrating here can never start or duplicate a paid render.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    Promise.all([getActiveExportAction(projectId), getLatestCompletedExportAction(projectId)]).then(([active, completed]) => {
      if (cancelled) return;

      if (active.found) {
        setState((prev) => (prev.phase === "idle" ? { phase: "rendering", progress: active.progress } : prev));
        setActiveJobId((prev) => prev ?? active.renderJobId);
        return;
      }

      if (completed.ok && completed.found) {
        setState((prev) => (prev.phase === "idle" ? { phase: "completed", downloadUrl: completed.downloadUrl, renderJobId: completed.renderJobId } : prev));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const isActive = state.phase === "starting" || state.phase === "rendering";

  async function handleExport() {
    if (!projectId || isActive) return;
    setState({ phase: "starting" });
    const result = await onExport();
    if (!result.ok) {
      setState({ phase: "failed", error: result.error });
      return;
    }
    setState({ phase: "rendering", progress: 0 });
    setActiveJobId(result.renderJobId);
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <h3 className="text-sm font-bold text-primary">{t("create.exportTitle")}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold text-brand-400">1080p</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-3 py-1 text-xs font-medium text-muted">
          <Lock className="size-3" />
          2K · {t("common.comingSoon")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-3 py-1 text-xs font-medium text-muted">
          <Lock className="size-3" />
          4K · {t("common.comingSoon")}
        </span>
      </div>

      {state.phase === "failed" && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-500">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {!projectId && state.phase === "idle" && <p className="mt-3 text-xs text-muted">{t("create.exportNeedsProject")}</p>}

      {state.phase === "completed" ? (
        <DownloadVideoButton downloadUrl={state.downloadUrl} renderJobId={state.renderJobId} projectId={projectId} />
      ) : (
        <Button className="mt-4 w-full" onClick={handleExport} disabled={!projectId || isActive}>
          {isActive ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {state.phase === "rendering"
            ? t("create.exportRendering").replace("{progress}", String(Math.round(state.progress * 100)))
            : state.phase === "starting"
              ? t("create.exportStarting")
              : t("create.exportButton")}
        </Button>
      )}
    </div>
  );
}
