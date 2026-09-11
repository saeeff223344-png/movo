"use client";

import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { VideoBrief } from "@/lib/types/video";

const PLATFORM_KEY: Record<VideoBrief["platform"], string> = {
  reels: "videoTypes.reels",
  tiktok: "videoTypes.tiktok",
  youtube: "videoTypes.youtube",
  general: "create.platformGeneral",
};

const STYLE_KEY: Record<VideoBrief["style"], string> = {
  fast: "create.styleFast",
  luxury: "create.styleLuxury",
  fun: "create.styleFun",
  tech: "create.styleTech",
  minimal: "create.styleMinimal",
  energetic: "create.styleEnergetic",
};

export function DetectedBriefCard({ brief }: { brief: VideoBrief }) {
  const { t } = useI18n();

  const rows: { label: string; value: string }[] = [
    { label: t("create.platformLabel"), value: t(PLATFORM_KEY[brief.platform]) },
    { label: t("create.ratioLabel"), value: brief.aspectRatio },
    { label: t("create.durationLabel"), value: `${brief.duration}s` },
    {
      label: t("create.videoLanguageLabel"),
      value: t(brief.detectedLanguage === "ar" ? "create.langArabic" : "create.langEnglish"),
    },
    { label: t("create.styleLabel"), value: t(STYLE_KEY[brief.style]) },
  ];

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
        <Sparkles className="size-4 text-brand-400" />
        {t("create.detectedBriefTitle")}
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-muted">{row.label}</span>
            <span className="font-semibold text-primary">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
