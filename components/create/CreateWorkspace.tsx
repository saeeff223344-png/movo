"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { PromptComposer } from "@/components/create/PromptComposer";
import { GenerationProgress } from "@/components/create/GenerationProgress";
import { ResultView } from "@/components/create/ResultView";
import { Button } from "@/components/ui/Button";
import { generateScenePlan, generateVideoBrief, briefToAdProps } from "@/lib/mock/generation";
import { applyRevision, REVISION_SIMULATION_MS } from "@/lib/mock/revisions";
import { mockTrial } from "@/lib/data/trial";
import { mockSubscription } from "@/lib/data/subscription";
import { STYLE_HINT_PROMPT_KEY } from "@/lib/data/style-hints";
import type { TemplateCategory } from "@/lib/data/templates";
import type { Asset, GenerationSettings, Revision, ScenePlan, VideoBrief } from "@/lib/types/video";
import type { AdCompositionProps } from "@/remotion/compositions/ad-types";

const DEFAULT_SETTINGS: GenerationSettings = {
  duration: "auto",
  aspectRatio: "auto",
  language: "auto",
  platform: "auto",
  style: "auto",
};

type Stage = "compose" | "generating" | "result";

export function CreateWorkspace() {
  const { t } = useI18n();
  const searchParams = useSearchParams();

  const [stage, setStage] = useState<Stage>("compose");
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

  const [brief, setBrief] = useState<VideoBrief | null>(null);
  const [, setScenePlan] = useState<ScenePlan | null>(null);
  const [adProps, setAdProps] = useState<AdCompositionProps | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [isApplyingRevision, setIsApplyingRevision] = useState(false);

  const trialBlocked = mockTrial.used && !mockSubscription.active;

  function handleGenerate() {
    if (!prompt.trim() || trialBlocked) return;
    const nextBrief = generateVideoBrief(prompt, settings, assets);
    setBrief(nextBrief);
    setScenePlan(generateScenePlan(nextBrief));
    setAdProps(briefToAdProps(nextBrief));
    setStage("generating");
  }

  function handleGenerationDone() {
    setStage("result");
  }

  function handleSubmitRevision(message: string) {
    if (!adProps) return;
    setIsApplyingRevision(true);
    window.setTimeout(() => {
      const outcome = applyRevision(adProps, message);
      setAdProps(outcome.props);
      setRevisions((prev) => [outcome.revision, ...prev]);
      setIsApplyingRevision(false);
    }, REVISION_SIMULATION_MS);
  }

  function handleStartOver() {
    setStage("compose");
    setBrief(null);
    setScenePlan(null);
    setAdProps(null);
    setRevisions([]);
  }

  if (trialBlocked) {
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

      {stage === "generating" && <GenerationProgress onDone={handleGenerationDone} />}

      {stage === "result" && brief && adProps && (
        <ResultView
          adProps={adProps}
          brief={brief}
          revisions={revisions}
          isApplyingRevision={isApplyingRevision}
          onSubmitRevision={handleSubmitRevision}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  );
}
