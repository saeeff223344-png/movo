"use client";

import { Users } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { PublicDeveloperPageSettings } from "@/lib/supabase/developers";

export function DevelopersHero({ pageSettings }: { pageSettings: PublicDeveloperPageSettings }) {
  const { t, locale } = useI18n();

  const title = (locale === "ar" ? pageSettings.pageTitleAr : pageSettings.pageTitleEn) || t("developers.title");
  const intro = (locale === "ar" ? pageSettings.introAr : pageSettings.introEn) || t("developers.desc");

  return (
    <div className="mx-auto max-w-2xl px-5 text-center sm:px-8">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-white shadow-lg shadow-brand-600/30">
        <Users className="size-6" />
      </span>
      <p className="mt-5 text-sm font-bold text-brand-400">{t("developers.eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-primary sm:text-4xl">{title}</h1>
      <p className="mt-3 text-secondary">{intro}</p>
    </div>
  );
}
