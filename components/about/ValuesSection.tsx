"use client";

import { Globe2, Sparkles, Wand2 } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useI18n } from "@/lib/i18n/context";

const VALUES = [
  { icon: Sparkles, titleKey: "about.value1Title", descKey: "about.value1Desc" },
  { icon: Globe2, titleKey: "about.value2Title", descKey: "about.value2Desc" },
  { icon: Wand2, titleKey: "about.value3Title", descKey: "about.value3Desc" },
];

export function ValuesSection() {
  const { t } = useI18n();

  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading eyebrow={t("about.heroEyebrow")} title={t("about.valuesTitle")} />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {VALUES.map((v) => (
            <div
              key={v.titleKey}
              className="rounded-2xl border border-border-subtle bg-surface p-7 text-center transition-transform hover:-translate-y-1"
            >
              <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                <v.icon className="size-6" strokeWidth={1.8} />
              </span>
              <h3 className="mt-4 text-base font-bold text-primary">{t(v.titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(v.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
