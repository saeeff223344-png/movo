"use client";

import { useI18n } from "@/lib/i18n/context";
import type { PlannedScene } from "@/lib/ai/video-plan-schema";
import type { EditableSceneField } from "@/lib/ai/plan-editing";

function titleCase(value: string): string {
  return value.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Lightweight post-generation editor (Phase 3) — narration and on-screen
 * text only, per scene. Every change flows back to ResultView's plan state
 * via onFieldChange, which re-derives the Remotion preview locally
 * (lib/ai/plan-to-scenes.ts) — no OpenAI call happens here.
 */
export function SceneEditor({
  scenes,
  dir,
  onFieldChange,
}: {
  scenes: PlannedScene[];
  dir: "rtl" | "ltr";
  onFieldChange: (sceneId: string, field: EditableSceneField, value: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <h3 className="text-sm font-bold text-primary">
        {t("create.aiPlanScenesTitle")} ({scenes.length})
      </h3>
      <p className="mt-1 text-xs text-muted">{t("create.sceneEditorHint")}</p>

      <ol className="mt-3 space-y-3" dir={dir}>
        {scenes.map((scene, i) => (
          <li key={scene.id} className="rounded-xl border border-border-subtle bg-base p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-primary">
                {i + 1}. {titleCase(scene.purpose)}
              </span>
              <span className="text-xs text-muted">
                {round1(scene.startTime)}s–{round1(scene.startTime + scene.duration)}s
              </span>
            </div>

            <label className="mt-3 block text-xs font-semibold text-muted" htmlFor={`${scene.id}-onScreenText`}>
              {t("create.aiPlanSceneOnScreenText")}
            </label>
            <input
              id={`${scene.id}-onScreenText`}
              type="text"
              value={scene.onScreenText ?? ""}
              onChange={(e) => onFieldChange(scene.id, "onScreenText", e.target.value)}
              dir={dir}
              className="mt-1 w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-brand-400/60"
            />

            <label className="mt-3 block text-xs font-semibold text-muted" htmlFor={`${scene.id}-narration`}>
              {t("create.aiPlanSceneNarration")}
            </label>
            <textarea
              id={`${scene.id}-narration`}
              value={scene.narration ?? ""}
              onChange={(e) => onFieldChange(scene.id, "narration", e.target.value)}
              dir={dir}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-brand-400/60"
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
