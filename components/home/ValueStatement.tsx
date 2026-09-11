"use client";

import { Clock, Languages, Wand2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

const POINTS = [
  { icon: Wand2, labelKey: "home.valueAiFirst" },
  { icon: Languages, labelKey: "home.valueBilingual" },
  { icon: Clock, labelKey: "home.valueMinutes" },
];

export function ValueStatement() {
  const { t } = useI18n();

  return (
    <section className="border-y border-border-subtle bg-surface py-10">
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <p className="text-balance text-lg font-bold text-primary sm:text-xl">
          {t("home.valueStatement")}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {POINTS.map((point) => (
            <span
              key={point.labelKey}
              className="inline-flex items-center gap-2 text-sm font-semibold text-secondary"
            >
              <point.icon className="size-4 text-brand-400" />
              {t(point.labelKey)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
