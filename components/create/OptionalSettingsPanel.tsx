"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { ChipSelect } from "@/components/create/ChipSelect";
import type { GenerationSettings } from "@/lib/types/video";

export function OptionalSettingsPanel({
  settings,
  onChange,
}: {
  settings: GenerationSettings;
  onChange: (settings: GenerationSettings) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  function update<K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold text-secondary transition-colors hover:text-primary"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="size-4" />
          {t("create.optionalSettings")}
        </span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="grid gap-5 border-t border-border-subtle px-5 py-5 sm:grid-cols-2">
          <ChipSelect
            label={t("create.durationLabel")}
            value={settings.duration}
            onChange={(v) => update("duration", v)}
            options={[
              { value: "auto", label: t("common.auto") },
              { value: 10, label: "10s" },
              { value: 15, label: "15s" },
              { value: 20, label: "20s" },
              { value: 30, label: "30s" },
            ]}
          />
          <ChipSelect
            label={t("create.ratioLabel")}
            value={settings.aspectRatio}
            onChange={(v) => update("aspectRatio", v)}
            options={[
              { value: "auto", label: t("common.auto") },
              { value: "9:16", label: "9:16" },
              { value: "16:9", label: "16:9" },
              { value: "1:1", label: "1:1" },
            ]}
          />
          <ChipSelect
            label={t("create.videoLanguageLabel")}
            value={settings.language}
            onChange={(v) => update("language", v)}
            options={[
              { value: "auto", label: t("common.auto") },
              { value: "ar", label: t("create.langArabic") },
              { value: "en", label: t("create.langEnglish") },
            ]}
          />
          <ChipSelect
            label={t("create.platformLabel")}
            value={settings.platform}
            onChange={(v) => update("platform", v)}
            options={[
              { value: "auto", label: t("common.auto") },
              { value: "reels", label: t("videoTypes.reels") },
              { value: "tiktok", label: t("videoTypes.tiktok") },
              { value: "youtube", label: t("videoTypes.youtube") },
              { value: "general", label: t("create.platformGeneral") },
            ]}
          />
          <div className="sm:col-span-2">
            <ChipSelect
              label={t("create.styleLabel")}
              value={settings.style}
              onChange={(v) => update("style", v)}
              options={[
                { value: "auto", label: t("common.auto") },
                { value: "fast", label: t("create.styleFast") },
                { value: "luxury", label: t("create.styleLuxury") },
                { value: "fun", label: t("create.styleFun") },
                { value: "tech", label: t("create.styleTech") },
                { value: "minimal", label: t("create.styleMinimal") },
                { value: "energetic", label: t("create.styleEnergetic") },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
