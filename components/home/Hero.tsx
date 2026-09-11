"use client";

import { Sparkles } from "lucide-react";
import { HeroPreview } from "@/components/remotion/HeroPreview";
import { PromptDemo } from "@/components/home/PromptDemo";
import { useI18n } from "@/lib/i18n/context";

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden pb-24 pt-16 sm:pt-24">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-32 right-1/2 h-96 w-96 translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px]" />
      <div className="pointer-events-none absolute top-40 left-10 h-64 w-64 rounded-full bg-accent-500/15 blur-[100px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="text-center lg:text-start">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-4 py-1.5 text-sm text-secondary">
            <Sparkles className="size-4 text-accent-400" />
            {t("home.heroBadge")}
          </div>

          <h1 className="text-balance text-4xl font-extrabold leading-[1.15] text-primary sm:text-5xl lg:text-[3.4rem]">
            {t("home.heroTitle")}
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-secondary lg:mx-0">
            {t("home.heroSubtitle")}
          </p>

          <div className="mx-auto mt-8 max-w-xl lg:mx-0">
            <PromptDemo />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted lg:justify-start">
            <span>{t("home.heroNoteTrial")}</span>
            <span className="size-1 rounded-full bg-border-strong" />
            <span>{t("home.heroNoteCard")}</span>
          </div>
        </div>

        <div className="animate-float">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}
