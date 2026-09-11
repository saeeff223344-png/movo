"use client";

import { MessageSquareText, Sparkles, Wand2 } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useI18n } from "@/lib/i18n/context";

const STEPS = [
  { icon: MessageSquareText, titleKey: "home.step1Title", descKey: "home.step1Desc" },
  { icon: Wand2, titleKey: "home.step2Title", descKey: "home.step2Desc" },
  { icon: Sparkles, titleKey: "home.step3Title", descKey: "home.step3Desc" },
];

export function HowItWorks() {
  const { t } = useI18n();

  return (
    <section id="how-it-works" className="relative py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("home.stepsEyebrow")}
          title={t("home.stepsTitle")}
          description={t("home.stepsDesc")}
        />

        <div className="relative mt-16 grid gap-10 sm:grid-cols-3">
          <div className="pointer-events-none absolute top-8 hidden h-px w-full bg-gradient-to-l from-transparent via-border-strong to-transparent sm:block" />

          {STEPS.map((step, index) => (
            <div key={step.titleKey} className="relative text-center">
              <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl border border-border-subtle bg-elevated">
                <step.icon className="size-6 text-brand-400" strokeWidth={2} />
                <span className="absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-5 text-base font-bold text-primary">{t(step.titleKey)}</h3>
              <p className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-muted">
                {t(step.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
