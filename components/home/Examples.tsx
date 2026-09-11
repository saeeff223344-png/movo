"use client";

import { Play } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { mockTemplates } from "@/lib/data/templates";

const CATEGORY_KEY: Record<string, string> = {
  restaurant: "templatesPage.categoryRestaurant",
  product: "templatesPage.categoryProduct",
  app: "templatesPage.categoryApp",
  fashion: "templatesPage.categoryFashion",
  offer: "templatesPage.categoryOffer",
  business: "templatesPage.categoryBusiness",
};

export function Examples() {
  const { t } = useI18n();

  return (
    <section id="examples" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("home.examplesEyebrow")}
          title={t("home.examplesTitle")}
          description={t("home.examplesDesc")}
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mockTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="group relative overflow-hidden rounded-2xl border border-border-subtle"
            >
              <div
                className={`relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br ${tpl.gradient}`}
              >
                <div className="bg-grid absolute inset-0 opacity-20" />
                <span className="flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                  <Play className="size-6 fill-white text-white" />
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
                <span className="text-xs font-semibold text-white/70">
                  {t(CATEGORY_KEY[tpl.category])}
                </span>
                <h3 className="mt-1 text-base font-bold text-white">{t(tpl.nameKey)}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button href="/templates" variant="outline" size="md">
            {t("home.examplesCta")}
          </Button>
        </div>
      </div>
    </section>
  );
}
