"use client";

import { Play } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { mockTemplates } from "@/lib/data/templates";

const LIMIT = 4;

export function InspirationRow() {
  const { t } = useI18n();
  const items = mockTemplates.slice(0, LIMIT);

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
        {items.map((tpl) => (
          <Link
            key={tpl.id}
            href={`/create?style=${tpl.category}`}
            className={`group relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${tpl.gradient}`}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
              <Play className="size-4 fill-white text-white" />
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 text-[11px] font-bold text-white">
              {t(tpl.nameKey)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
