"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { mockTemplates, TEMPLATE_CATEGORIES, type TemplateCategory } from "@/lib/data/templates";
import { TemplateCard } from "@/components/templates/TemplateCard";

const CATEGORY_KEY: Record<TemplateCategory, string> = {
  restaurant: "templatesPage.categoryRestaurant",
  product: "templatesPage.categoryProduct",
  app: "templatesPage.categoryApp",
  fashion: "templatesPage.categoryFashion",
  offer: "templatesPage.categoryOffer",
  business: "templatesPage.categoryBusiness",
};

export function TemplatesLibraryView() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<TemplateCategory | "all">("all");

  const filtered =
    filter === "all" ? mockTemplates : mockTemplates.filter((tpl) => tpl.category === filter);

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-primary sm:text-4xl">
          {t("templatesPage.title")}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-secondary">{t("templatesPage.subtitle")}</p>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            filter === "all"
              ? "bg-brand-500 text-white"
              : "bg-surface text-secondary hover:text-primary"
          }`}
        >
          {t("templatesPage.filterAll")}
        </button>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              filter === cat
                ? "bg-brand-500 text-white"
                : "bg-surface text-secondary hover:text-primary"
            }`}
          >
            {t(CATEGORY_KEY[cat])}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tpl) => (
          <TemplateCard key={tpl.id} template={tpl} />
        ))}
      </div>
    </div>
  );
}
