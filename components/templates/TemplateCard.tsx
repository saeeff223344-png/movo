"use client";

import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { Template } from "@/lib/data/templates";

const CATEGORY_KEY: Record<Template["category"], string> = {
  restaurant: "templatesPage.categoryRestaurant",
  product: "templatesPage.categoryProduct",
  app: "templatesPage.categoryApp",
  fashion: "templatesPage.categoryFashion",
  offer: "templatesPage.categoryOffer",
  business: "templatesPage.categoryBusiness",
};

export function TemplateCard({ template }: { template: Template }) {
  const { t, locale } = useI18n();
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="group overflow-hidden rounded-2xl border border-border-subtle bg-surface transition-all hover:-translate-y-1 hover:border-border-strong">
      <div
        className={`relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br ${template.gradient}`}
      >
        <div className="bg-grid absolute inset-0 opacity-20" />
        <span className="flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
          <Play className="size-6 fill-white text-white" />
        </span>
        <span className="absolute top-3 end-3 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
          {template.ratio}
        </span>
      </div>
      <div className="p-4">
        <span className="text-xs font-semibold text-brand-400">
          {t(CATEGORY_KEY[template.category])}
        </span>
        <h3 className="mt-1 text-sm font-bold text-primary">{t(template.nameKey)}</h3>
        <a
          href={`/create?style=${template.category}`}
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-secondary transition-colors hover:text-primary"
        >
          {t("home.useStyle")}
          <Arrow className="size-3" />
        </a>
      </div>
    </div>
  );
}
