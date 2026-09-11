"use client";

import { RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdPreviewPlayer } from "@/components/remotion/AdPreviewPlayer";
import { DetectedBriefCard } from "@/components/create/DetectedBriefCard";
import { RevisionComposer } from "@/components/create/RevisionComposer";
import { ExportPanel } from "@/components/create/ExportPanel";
import type { AdCompositionProps } from "@/remotion/compositions/ad-types";
import type { Revision, VideoBrief } from "@/lib/types/video";

export function ResultView({
  adProps,
  brief,
  revisions,
  isApplyingRevision,
  onSubmitRevision,
  onStartOver,
}: {
  adProps: AdCompositionProps;
  brief: VideoBrief;
  revisions: Revision[];
  isApplyingRevision: boolean;
  onSubmitRevision: (message: string) => void;
  onStartOver: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <div>
        <div className="mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-3xl border border-border-subtle bg-black shadow-2xl shadow-black/30 lg:max-w-none">
          <AdPreviewPlayer adProps={adProps} />
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

      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold text-brand-400">{t("create.resultEyebrow")}</p>
          <h1 className="mt-1 text-xl font-extrabold text-primary sm:text-2xl">
            {adProps.brandName}
          </h1>
        </div>

        <DetectedBriefCard brief={brief} />
        <RevisionComposer
          revisions={revisions}
          isApplying={isApplyingRevision}
          onSubmit={onSubmitRevision}
        />
        <ExportPanel />
      </div>
    </div>
  );
}
