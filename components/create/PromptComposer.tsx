"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AssetUploader } from "@/components/create/AssetUploader";
import { OptionalSettingsPanel } from "@/components/create/OptionalSettingsPanel";
import { useI18n } from "@/lib/i18n/context";
import type { Asset, GenerationSettings } from "@/lib/types/video";

export function PromptComposer({
  prompt,
  onPromptChange,
  assets,
  onAssetsChange,
  settings,
  onSettingsChange,
  onGenerate,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  assets: Asset[];
  onAssetsChange: (assets: Asset[]) => void;
  settings: GenerationSettings;
  onSettingsChange: (settings: GenerationSettings) => void;
  onGenerate: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-3xl border border-border-subtle bg-elevated p-5 shadow-xl shadow-black/5 sm:p-7">
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        rows={5}
        maxLength={600}
        placeholder={t("create.promptPlaceholder")}
        className="w-full resize-none bg-transparent text-lg leading-relaxed text-primary placeholder-muted outline-none"
      />

      <div className="mt-2 text-end text-xs text-muted">{prompt.length}/600</div>

      <div className="my-5 h-px bg-border-subtle" />

      <AssetUploader
        kinds={["product", "logo", "reference", "video"]}
        assets={assets}
        onChange={onAssetsChange}
      />

      <div className="mt-6">
        <OptionalSettingsPanel settings={settings} onChange={onSettingsChange} />
      </div>

      <div className="mt-6 flex justify-center">
        <Button
          type="button"
          size="lg"
          onClick={onGenerate}
          disabled={prompt.trim().length === 0}
          className="w-full sm:w-auto"
        >
          <Sparkles className="size-5" />
          {t("create.generateCta")}
        </Button>
      </div>
    </div>
  );
}
