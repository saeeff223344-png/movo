"use client";

import {
  Download,
  Gauge,
  Globe,
  LayoutTemplate,
  Wand2,
  Wrench,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useI18n } from "@/lib/i18n/context";

const FEATURES = [
  { icon: Globe, titleKey: "home.featureGlobalTitle", descKey: "home.featureGlobalDesc" },
  { icon: Gauge, titleKey: "home.featureSpeedTitle", descKey: "home.featureSpeedDesc" },
  { icon: Wrench, titleKey: "home.featureEaseTitle", descKey: "home.featureEaseDesc" },
  {
    icon: LayoutTemplate,
    titleKey: "home.featureTemplatesTitle",
    descKey: "home.featureTemplatesDesc",
  },
  { icon: Wand2, titleKey: "home.featureEngineTitle", descKey: "home.featureEngineDesc" },
  { icon: Download, titleKey: "home.featureExportTitle", descKey: "home.featureExportDesc" },
];

export function Features() {
  const { t } = useI18n();

  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("home.featuresEyebrow")}
          title={t("home.featuresTitle")}
        />

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.titleKey}
              className="bg-base p-8 transition-colors hover:bg-surface-hover"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                <feature.icon className="size-5" strokeWidth={2} />
              </span>
              <h3 className="mt-5 text-base font-bold text-primary">
                {t(feature.titleKey)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t(feature.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
