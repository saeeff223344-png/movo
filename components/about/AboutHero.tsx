"use client";

import { Clapperboard } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function AboutHero() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden py-24 text-center">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-32 right-1/2 h-96 w-96 translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px]" />

      <div className="relative mx-auto max-w-3xl px-5 sm:px-8">
        <span className="mx-auto flex size-16 animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-white shadow-xl shadow-brand-600/30">
          <Clapperboard className="size-8" strokeWidth={1.8} />
        </span>
        <p className="mt-6 text-sm font-bold text-brand-400">{t("about.heroEyebrow")}</p>
        <h1 className="mt-3 text-balance text-3xl font-extrabold text-primary sm:text-5xl">
          {t("about.heroTitle")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-secondary">
          {t("about.heroDesc")}
        </p>
      </div>
    </section>
  );
}
