"use client";

import { AdPreviewPlayer } from "@/components/remotion/AdPreviewPlayer";
import { DEFAULT_AD_PROPS } from "@/remotion/compositions/ad-types";
import { useI18n } from "@/lib/i18n/context";

export function HeroPreview() {
  const { t } = useI18n();

  return (
    <div className="relative mx-auto w-full max-w-xs">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-500/40 to-accent-500/30 blur-3xl" />

      <div className="overflow-hidden rounded-3xl border border-border-subtle bg-elevated shadow-2xl shadow-black/50">
        <div className="flex items-center gap-1.5 border-b border-border-subtle bg-surface px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-yellow-400/70" />
          <span className="size-2.5 rounded-full bg-green-400/70" />
          <span className="ms-auto text-xs text-muted">{t("home.previewLabel")}</span>
        </div>
        <div className="aspect-[9/16]">
          <AdPreviewPlayer adProps={DEFAULT_AD_PROPS} />
        </div>
      </div>
    </div>
  );
}
