"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { PlanPreviewPlayer } from "@/components/remotion/PlanPreviewPlayer";
import { previewMaxWidthClass } from "@/components/remotion/player-sizing";
import { buildVideoPlanRenderData } from "@/lib/ai/plan-to-scenes";
import { updateSceneField, type EditableSceneField } from "@/lib/ai/plan-editing";
import { SceneEditor } from "@/components/create/SceneEditor";
import { AudioPreferencesPanel } from "@/components/create/AudioPreferencesPanel";
import { ExportPanel } from "@/components/create/ExportPanel";
import { PLATFORM_KEY, STYLE_KEY } from "@/components/create/DetectedBriefCard";
import { LOCALE_DIR } from "@/lib/i18n/config";
import { AD_FPS } from "@/remotion/constants";
import { resolveAudioSettings } from "@/lib/audio/audio-settings";
import { synthesizeVideoPlanNarrationAction } from "@/lib/actions/narration-actions";
import { saveProjectNarrationAction, saveProjectPlanAction } from "@/lib/actions/project-actions";
import { startExportAction, type StartExportResult } from "@/lib/actions/export-actions";
import { FAILED_NARRATION_RESULT, buildNarrationTrims, type PlanNarrationResult } from "@/lib/audio/plan-narration";
import type { ResolvedSceneVisual } from "@/lib/visuals/types";
import type { ResolvedSceneVideo } from "@/lib/video-generation/types";
import type { VideoPlan, AudioSettings } from "@/lib/ai/video-plan-schema";
import type { Asset } from "@/lib/types/video";

/** Editor edits are debounced by this much before being persisted (Requirement 9: minimal debounce, no version history) — long enough to not fire on every keystroke, short enough that a reload right after an edit rarely loses it. */
const PLAN_SAVE_DEBOUNCE_MS = 1200;

/**
 * The real result view (Phase 3) — a validated VideoPlan (Phase 1) played
 * through the real Remotion preview (Phase 2), plus a lightweight scene
 * editor. Edits update local state immediately (so the preview re-renders
 * instantly) and are separately persisted on a short debounce when
 * `projectId` is available; no second OpenAI call happens here. Replaces
 * the old AdCompositionProps/VideoBrief-driven mock result view.
 */
export function ResultView({
  plan,
  assets,
  projectId,
  projectSaveFailed,
  initialNarration,
  initialVisuals,
  initialVideos,
  onStartOver,
}: {
  plan: VideoPlan;
  assets: Asset[];
  /** The saved project's row id (also the narration Storage generationId) — null when the initial save failed (Requirement 12: the plan is still usable this session, it just won't survive a reload, and no further persistence is attempted). */
  projectId: string | null;
  /** True when CreateWorkspace's initial project save failed — shown once as a small, non-blocking notice; editing/retrying still work in-session. */
  projectSaveFailed: boolean;
  initialNarration: PlanNarrationResult;
  /** Every scene's already-resolved automatic visual (Automatic Visual Assets phase) — keyed by scene id, empty when none applied (no scene needed one, every attempt failed, or this project predates the feature). */
  initialVisuals: Record<string, ResolvedSceneVisual>;
  /** Every scene's already-resolved AI-generated video (Dynamic AI Video Director phase) — keyed by scene id, empty when none applied (director recommended REMOTION_ONLY for every scene, Runway generation failed, or this project predates the feature). Takes priority over initialVisuals for the scenes it covers — see lib/ai/plan-to-scenes.ts. */
  initialVideos: Record<string, ResolvedSceneVideo>;
  onStartOver: () => void;
}) {
  const { t } = useI18n();
  const [editedPlan, setEditedPlan] = useState(plan);
  const [narration, setNarration] = useState(initialNarration);
  const [retryingVoice, setRetryingVoice] = useState(false);
  const dir = LOCALE_DIR[editedPlan.language];
  const renderData = useMemo(
    () => buildVideoPlanRenderData(editedPlan, assets, AD_FPS, narration.narrationAudioUrls, buildNarrationTrims(narration.sceneAudio), initialVisuals, initialVideos),
    [editedPlan, assets, narration, initialVisuals, initialVideos],
  );
  const hasVoiceIssue = narration.status === "partial" || narration.status === "failed";

  // Only used as a narration Storage generationId when there's no persisted
  // project to key off of — stable for this component's whole lifetime so
  // repeated retries in that degraded case still upsert the same objects
  // instead of orphaning a new copy per click (see narration-storage.ts).
  const fallbackGenerationId = useRef(crypto.randomUUID());
  const storageGenerationId = projectId ?? fallbackGenerationId.current;

  // Debounced auto-save of edits (Requirement 9) — skips the very first
  // render (the plan as generated is already persisted by CreateWorkspace)
  // and does nothing at all when there's no project to save to.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!projectId) return;

    const timeout = window.setTimeout(() => {
      saveProjectPlanAction(projectId, editedPlan).then((result) => {
        if (!result.ok) console.error("[ResultView] saveProjectPlanAction failed:", result.error);
      });
    }, PLAN_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [editedPlan, projectId]);

  function handleSceneFieldChange(sceneId: string, field: EditableSceneField, value: string) {
    setEditedPlan((prev) => updateSceneField(prev, sceneId, field, value));
  }

  function handleAudioChange(next: AudioSettings) {
    setEditedPlan((prev) => ({ ...prev, audio: next }));
  }

  /**
   * Re-runs real narration synthesis for the *current* (possibly edited)
   * plan — editing a scene's narration text in SceneEditor doesn't
   * automatically re-synthesize its audio (a known limitation for this
   * launch phase), so this button also doubles as the way to pick up a
   * manual narration edit's audio. When a project is saved, the refreshed
   * storage paths/metadata are persisted too (Requirement 10) — overwriting
   * the previous narration entry for this project, never accumulating one.
   */
  async function handleRetryVoice() {
    setRetryingVoice(true);
    try {
      const result = await synthesizeVideoPlanNarrationAction(editedPlan, storageGenerationId);
      setNarration(result);
      if (projectId) {
        const saved = await saveProjectNarrationAction(projectId, editedPlan, result);
        if (!saved.ok) console.error("[ResultView] saveProjectNarrationAction failed:", saved.error);
      }
    } catch {
      setNarration(FAILED_NARRATION_RESULT);
    } finally {
      setRetryingVoice(false);
    }
  }

  /**
   * Saves the latest edited plan first (Requirement 10: never render an
   * arbitrary/stale client payload — the server only ever renders what's
   * actually persisted), then starts the real export. If there's no
   * project to export (initial save failed), ExportPanel already disables
   * the button, but this stays defensive rather than calling the action
   * with an invalid id.
   */
  async function handleExport(): Promise<StartExportResult> {
    if (!projectId) return { ok: false, error: t("create.exportNeedsProject"), code: "not_found" };
    const saved = await saveProjectPlanAction(projectId, editedPlan);
    if (!saved.ok) return { ok: false, error: saved.error, code: "db_error" };
    return startExportAction(projectId);
  }

  const rows: { label: string; value: string }[] = [
    { label: t("create.aiPlanBusinessLabel"), value: editedPlan.business },
    { label: t("create.aiPlanObjectiveLabel"), value: editedPlan.objective },
    { label: t("create.aiPlanAudienceLabel"), value: editedPlan.targetAudience },
    { label: t("create.platformLabel"), value: t(PLATFORM_KEY[editedPlan.platform]) },
    { label: t("create.ratioLabel"), value: editedPlan.aspectRatio },
    { label: t("create.durationLabel"), value: `${editedPlan.durationSeconds}s` },
    { label: t("create.styleLabel"), value: t(STYLE_KEY[editedPlan.visualStyle]) },
    { label: t("create.aiPlanCtaLabel"), value: editedPlan.cta },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <div className="min-w-0">
        <div
          className={`mx-auto w-full overflow-hidden rounded-3xl border border-border-subtle bg-black shadow-2xl shadow-black/30 ${previewMaxWidthClass(renderData.width, renderData.height)}`}
        >
          <PlanPreviewPlayer data={renderData} />
        </div>
        <button
          type="button"
          onClick={onStartOver}
          className="mx-auto mt-4 flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary"
        >
          <RotateCcw className="size-3.5" />
          {t("create.startOver")}
        </button>
      </div>

      <div className="min-w-0 space-y-5">
        <div lang={editedPlan.language} dir={dir}>
          <p className="text-xs font-bold text-brand-400">{t("create.resultEyebrow")}</p>
          <h1 className="mt-1 text-xl font-extrabold text-primary sm:text-2xl">{editedPlan.videoTitle}</h1>
        </div>

        {projectSaveFailed && (
          <p className="text-xs text-amber-500" lang={editedPlan.language} dir={dir}>
            {t("create.projectSaveFailedNotice")}
          </p>
        )}

        {hasVoiceIssue && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-500" lang={editedPlan.language} dir={dir}>
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1">
              <p>{t("create.voiceIssueBanner")}</p>
              <button
                type="button"
                onClick={handleRetryVoice}
                disabled={retryingVoice}
                className="mt-2 font-semibold underline underline-offset-2 disabled:opacity-50"
              >
                {retryingVoice ? t("create.voiceRetrying") : t("create.voiceRetry")}
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border-subtle bg-surface p-5" lang={editedPlan.language} dir={dir}>
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="shrink-0 text-muted">{row.label}</span>
                <span className="min-w-0 truncate font-semibold text-primary">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <SceneEditor scenes={editedPlan.scenes} dir={dir} onFieldChange={handleSceneFieldChange} />

        <AudioPreferencesPanel audio={resolveAudioSettings(editedPlan)} onChange={handleAudioChange} />

        <ExportPanel projectId={projectId} onExport={handleExport} />
      </div>
    </div>
  );
}
