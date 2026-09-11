"use client";

import { Play } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import type { PublicExample } from "@/lib/supabase/examples";

const CATEGORY_KEY: Record<string, string> = {
  restaurant: "templatesPage.categoryRestaurant",
  product: "templatesPage.categoryProduct",
  app: "templatesPage.categoryApp",
  fashion: "templatesPage.categoryFashion",
  offer: "templatesPage.categoryOffer",
  business: "templatesPage.categoryBusiness",
};

/** Real examples from Supabase (same table /admin/examples manages) — capped
 * to 6 here since this is a homepage teaser, not the full library (/templates
 * shows all of them). Falls back to the gradient placeholder when an example
 * has no uploaded thumbnail_url yet — never a hardcoded image. */
export function Examples({ examples }: { examples: PublicExample[] }) {
  const { t, locale } = useI18n();
  const shown = examples.slice(0, 6);

  return (
    <section id="examples" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("home.examplesEyebrow")}
          title={t("home.examplesTitle")}
          description={t("home.examplesDesc")}
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((ex) => (
            <div
              key={ex.id}
              className="group relative overflow-hidden rounded-2xl border border-border-subtle"
            >
              <div
                className={`relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br ${ex.thumbnailGradient}`}
              >
                {ex.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- storage-uploaded URL
                  <img src={ex.thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <div className="bg-grid absolute inset-0 opacity-20" />
                )}
                <span className="relative flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                  <Play className="size-6 fill-white text-white" />
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
                <span className="text-xs font-semibold text-white/70">
                  {t(CATEGORY_KEY[ex.category] ?? "templatesPage.categoryBusiness")}
                </span>
                <h3 className="mt-1 text-base font-bold text-white">
                  {locale === "ar" ? ex.titleAr : ex.titleEn}
                </h3>
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
