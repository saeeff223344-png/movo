"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { PromptComposer } from "@/components/create/PromptComposer";
import { GenerationProgress } from "@/components/create/GenerationProgress";
import { VoiceGenerationProgress } from "@/components/create/VoiceGenerationProgress";
import { ResultView } from "@/components/create/ResultView";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import { generateVideoPlanAction } from "@/lib/actions/video-plan-actions";
import { synthesizeVideoPlanNarrationAction } from "@/lib/actions/narration-actions";
import { generateVideoPlanVisualsAction, type ResolvedSceneVisual } from "@/lib/actions/visual-actions";
import { directAndGenerateSceneVideosAction, type ResolvedSceneVideo } from "@/lib/actions/video-direction-actions";
import { saveGeneratedProjectAction, saveProjectNarrationAction, saveProjectVisualsAction, saveProjectVideosAction, loadProjectAction } from "@/lib/actions/project-actions";
import { FAILED_NARRATION_RESULT, type PlanNarrationResult } from "@/lib/audio/plan-narration";
import { STYLE_HINT_PROMPT_KEY } from "@/lib/data/style-hints";
import type { TemplateCategory } from "@/lib/data/templates";
import type { Asset, GenerationSettings } from "@/lib/types/video";
import type { VideoPlan } from "@/lib/ai/video-plan-schema";
import type { PlannerErrorCode } from "@/lib/ai/planner-errors";

const DEFAULT_SETTINGS: GenerationSettings = {
  duration: "auto",
  aspectRatio: "auto",
  language: "auto",
  platform: "auto",
  style: "auto",
};

const ERROR_KEY: Record<PlannerErrorCode, string> = {
  empty_prompt: "create.aiPlanErrorEmptyPrompt",
  missing_api_key: "create.aiPlanErrorMissingKey",
  timeout: "create.aiPlanErrorTimeout",
  rate_limited: "create.aiPlanErrorRateLimited",
  invalid_output: "create.aiPlanErrorInvalidOutput",
  refused: "create.aiPlanErrorRefused",
  unavailable: "create.aiPlanErrorUnavailable",
};

type Stage = "compose" | "restoring" | "planning" | "generating-voice" | "generating-visuals" | "directing-motion" | "preparing-preview" | "result";

/**
 * Phase 3: the real AI planner (lib/actions/video-plan-actions.ts) + real
 * Remotion preview (lib/ai/plan-to-scenes.ts, components/remotion/*) drive
 * the main Generate button directly — no more mocked
 * generateVideoBrief/generateScenePlan/briefToAdProps, and no separate
 * "Analyze with AI" affordance (it's redundant now that Generate itself
 * calls the real pipeline). Trial/subscription usage is still untouched —
 * that's a later phase.
 *
 * Persistence (Requirement: minimal project/generation records): a
 * successful VideoPlan is saved to public.projects immediately
 * (lib/actions/project-actions.ts), and its row id becomes both the DB
 * primary key and the narration Storage `generationId` — no separate id.
 * `?project=<id>` in the URL is the entire "reload" mechanism: on mount,
 * its presence loads the saved plan + re-signs narration URLs instead of
 * starting a new generation.
 */
export function CreateWorkspace({ trialUsed, subscriptionActive }: { trialUsed: boolean; subscriptionActive: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialized eagerly from the URL (not just set inside the restore effect)
  // so a trial-consumed user reloading `?project=<id>` never paints the
  // blocked gate for a frame before the restore effect below takes over.
  const [stage, setStage] = useState<Stage>(() => (searchParams.get("project") ? "restoring" : "compose"));
  const [prompt, setPrompt] = useState(() => {
    const promptParam = searchParams.get("prompt");
    if (promptParam) return promptParam;

    const styleParam = searchParams.get("style") as TemplateCategory | null;
    if (styleParam && styleParam in STYLE_HINT_PROMPT_KEY) {
      return t(STYLE_HINT_PROMPT_KEY[styleParam]);
    }
    return "";
  });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);

  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const [planError, setPlanError] = useState<PlannerErrorCode | null>(null);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [narration, setNarration] = useState<PlanNarrationResult | null>(null);
  const [visuals, setVisuals] = useState<Record<string, ResolvedSceneVisual>>({});
  const [videos, setVideos] = useState<Record<string, ResolvedSceneVideo>>({});
  /** Also the narration Storage generationId once a save has succeeded. Null only when persistence itself failed (see projectSaveFailed) — narration/preview still work in-session either way, just won't survive a reload. */
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectSaveFailed, setProjectSaveFailed] = useState(false);
  /** Set when the server rejects a request as unentitled (no trial left, no active subscription) — a live, server-verified fact, unlike `trialBlocked` below which is only a snapshot from page load. Once true, stays true for this page's lifetime (matches trialBlocked's own permanence) until "start over". */
  const [entitlementBlocked, setEntitlementBlocked] = useState(false);

  const trialBlocked = trialUsed && !subscriptionActive;
  const showBlockedGate = trialBlocked || entitlementBlocked;
  const isBusy =
    stage === "planning" ||
    stage === "generating-voice" ||
    stage === "generating-visuals" ||
    stage === "directing-motion" ||
    stage === "preparing-preview" ||
    stage === "restoring";

  // Restore-on-reload: runs once, only when the URL already names a project.
  const restoreAttempted = useRef(false);
  useEffect(() => {
    const existingProjectId = searchParams.get("project");
    if (!existingProjectId || restoreAttempted.current) return;
    restoreAttempted.current = true;

    setStage("restoring");
    loadProjectAction(existingProjectId).then((result) => {
      if (!result.ok) {
        setRestoreFailed(true);
        setStage("compose");
        return;
      }
      setPrompt(result.prompt);
      setPlan(result.plan);
      setNarration(result.narration);
      setVisuals(result.visuals);
      setVideos(result.videos);
      setProjectId(result.projectId);
      setStage("result");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once for the project param present at mount, not on every searchParams identity change
  }, []);

  /**
   * The full real pipeline (brief -> VideoPlan -> Egyptian/neutral-dialect
   * narration audio -> Remotion preview): "planning" awaits the OpenAI
   * planner, "generating-voice" awaits real ElevenLabs Haytham/OpenAI TTS
   * synthesis (lib/actions/narration-actions.ts), "preparing-preview"
   * assembles the render data ResultView needs. A TTS failure never loses
   * the plan — synthesizeVideoPlanNarrationAction always resolves to a
   * usable (if degraded) result, and ResultView surfaces that via a banner
   * rather than blocking the user from their generated video. The same is
   * true of a project-save failure below: the in-memory plan is still used
   * for this session even though it won't survive a reload.
   */
  async function handleGenerate() {
    if (!prompt.trim() || showBlockedGate || isBusy) return;
    setPlanError(null);
    setProjectSaveFailed(false);
    setStage("planning");

    const planResult = await generateVideoPlanAction(prompt, settings);
    if (!planResult.ok) {
      if (planResult.code === "trial_required") {
        setEntitlementBlocked(true);
        setStage("compose");
        return;
      }
      setPlanError(planResult.code);
      setStage("compose");
      return;
    }
    setPlan(planResult.plan);

    const saveResult = await saveGeneratedProjectAction(prompt, planResult.plan);
    if (!saveResult.ok && saveResult.code === "entitlement_blocked") {
      // Only reachable via a rare check-then-act race (the pre-check above
      // passed, but this — the real, atomic gate — didn't). Never proceed
      // to narration synthesis on an unentitled plan: that would spend real
      // ElevenLabs credits on a generation the user isn't allowed to have.
      setEntitlementBlocked(true);
      setStage("compose");
      setPlan(null);
      return;
    }

    let activeProjectId: string | null = null;
    if (saveResult.ok) {
      activeProjectId = saveResult.projectId;
      setProjectId(saveResult.projectId);
      router.replace(`${pathname}?project=${saveResult.projectId}`);
    } else {
      console.error("[CreateWorkspace] saveGeneratedProjectAction failed:", saveResult.error);
      setProjectSaveFailed(true);
    }

    // Falls back to a session-only id when persistence failed, purely so
    // Storage still has somewhere collision-safe to put this generation's
    // clips — see lib/audio/narration-storage.ts's path convention.
    const generationId = activeProjectId ?? crypto.randomUUID();

    setStage("generating-voice");
    const narrationResult = await synthesizeVideoPlanNarrationAction(planResult.plan, generationId).catch(() => FAILED_NARRATION_RESULT);
    setNarration(narrationResult);

    if (activeProjectId) {
      const savedNarration = await saveProjectNarrationAction(activeProjectId, planResult.plan, narrationResult).catch(() => null);
      if (!savedNarration?.ok) console.error("[CreateWorkspace] saveProjectNarrationAction failed:", savedNarration?.error);
    }

    setStage("generating-visuals");
    const visualsResult = await generateVideoPlanVisualsAction(planResult.plan, assets, generationId).catch(() => ({}) as Record<string, ResolvedSceneVisual>);
    setVisuals(visualsResult);

    if (activeProjectId && Object.keys(visualsResult).length > 0) {
      await saveProjectVisualsAction(activeProjectId, visualsResult).catch((error) => console.error("[CreateWorkspace] saveProjectVisualsAction failed:", error));
    }

    setStage("directing-motion");
    const videosResult = await directAndGenerateSceneVideosAction(planResult.plan, assets, generationId, visualsResult).catch(
      () => ({}) as Record<string, ResolvedSceneVideo>,
    );
    setVideos(videosResult);

    if (activeProjectId && Object.keys(videosResult).length > 0) {
      await saveProjectVideosAction(activeProjectId, videosResult).catch((error) => console.error("[CreateWorkspace] saveProjectVideosAction failed:", error));
    }

    setStage("preparing-preview");
    await Promise.resolve();
    setStage("result");
  }

  function handleStartOver() {
    setStage("compose");
    setPlan(null);
    setPlanError(null);
    setRestoreFailed(false);
    setNarration(null);
    setVisuals({});
    setVideos({});
    setProjectId(null);
    setProjectSaveFailed(false);
    restoreAttempted.current = true; // a fresh generation from here should never re-trigger the mount-time restore
    router.replace(pathname);
  }

  // `trialUsed`/`subscriptionActive` are server props re-fetched whenever
  // this route's search params change (our own router.replace to
  // `?project=<id>` after a successful generation included) — so the trial
  // this very generation just consumed can flip `trialBlocked` true before
  // the user ever sees their result. The gate must only stop *starting a
  // new* generation, never hide one already loaded/loading: excluding
  // "result" and "restoring" keeps a just-created or reloaded trial project
  // (and its retry/export actions) reachable, matching the locked rule that
  // a trial project stays accessible after the trial is spent.
  if (showBlockedGate && stage !== "result" && stage !== "restoring") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-hover text-muted">
          <Lock className="size-6" />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-primary">
          {t("create.trialBlockedTitle")}
        </h2>
        <p className="mt-2 text-sm text-secondary">{t("create.trialBlockedDesc")}</p>
        <Button href="/subscription" className="mt-6">
          {t("dashboard.goToSubscription")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {stage === "compose" && (
        <>
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
              {t("create.pageTitle")}
            </h1>
            <p className="mt-2 text-secondary">{t("create.pageSubtitle")}</p>
          </div>
          {planError && <AuthError message={t(ERROR_KEY[planError])} />}
          {restoreFailed && <AuthError message={t("create.projectNotFound")} />}
          <PromptComposer
            prompt={prompt}
            onPromptChange={setPrompt}
            assets={assets}
            onAssetsChange={setAssets}
            settings={settings}
            onSettingsChange={setSettings}
            onGenerate={handleGenerate}
          />
        </>
      )}

      {stage === "restoring" && <VoiceGenerationProgress phase="preview" />}
      {stage === "planning" && <GenerationProgress />}
      {stage === "generating-voice" && <VoiceGenerationProgress phase="voice" />}
      {stage === "generating-visuals" && <VoiceGenerationProgress phase="visuals" />}
      {stage === "directing-motion" && <VoiceGenerationProgress phase="motion" />}
      {stage === "preparing-preview" && <VoiceGenerationProgress phase="preview" />}

      {stage === "result" && plan && (
        <ResultView
          plan={plan}
          assets={assets}
          projectId={projectId}
          projectSaveFailed={projectSaveFailed}
          initialNarration={narration ?? FAILED_NARRATION_RESULT}
          initialVisuals={visuals}
          initialVideos={videos}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  );
}
