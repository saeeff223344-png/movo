"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { TEMPLATE_CATEGORIES, type TemplateCategory } from "@/lib/data/templates";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Film } from "lucide-react";
import type { PublicExample } from "@/lib/supabase/examples";

const CATEGORY_KEY: Record<TemplateCategory, string> = {
  restaurant: "templatesPage.categoryRestaurant",
  product: "templatesPage.categoryProduct",
  app: "templatesPage.categoryApp",
  fashion: "templatesPage.categoryFashion",
  offer: "templatesPage.categoryOffer",
  business: "templatesPage.categoryBusiness",
};

export function TemplatesLibraryView({ examples }: { examples: PublicExample[] }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<TemplateCategory | "all">("all");

  const filtered =
    filter === "all" ? examples : examples.filter((ex) => ex.category === filter);

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

      {filtered.length === 0 ? (
        <div className="mt-10">
          <EmptyState icon={Film} title={t("templatesPage.empty")} description="" />
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ex) => (
            <TemplateCard key={ex.id} example={ex} />
          ))}
        </div>
      )}
    </div>
  );
}
