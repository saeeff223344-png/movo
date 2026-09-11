"use client";

import { Check } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useI18n } from "@/lib/i18n/context";

const ITEMS = ["what1", "what2", "what3", "what4", "what5"];

export function OfferSection() {
  const { t } = useI18n();

  return (
    <section className="py-16">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <SectionHeading eyebrow={t("about.heroEyebrow")} title={t("about.whatTitle")} />
        <ul className="mt-10 space-y-4">
          {ITEMS.map((key) => (
            <li
              key={key}
              className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface p-4"
            >
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span className="text-sm leading-relaxed text-secondary">
                {t(`about.${key}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
