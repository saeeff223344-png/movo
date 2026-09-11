"use client";

import { Play } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import type { PublicExample } from "@/lib/supabase/examples";

const LIMIT = 4;

export function InspirationRow({ examples }: { examples: PublicExample[] }) {
  const { t, locale } = useI18n();
  const items = examples.slice(0, LIMIT);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">{t("dashboard.inspirationTitle")}</h2>
        <Link
          href="/templates"
          className="text-xs font-bold text-brand-400 hover:text-brand-300"
        >
          {t("dashboard.seeAll")}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((ex) => (
          <Link
            key={ex.id}
            href={`/create?style=${ex.category}`}
            className={`group relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${ex.thumbnailGradient}`}
          >
            {ex.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- storage-uploaded URL
              <img src={ex.thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />
            )}
            <span className="relative flex size-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
              <Play className="size-4 fill-white text-white" />
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 text-[11px] font-bold text-white">
              {locale === "ar" ? ex.titleAr : ex.titleEn}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
