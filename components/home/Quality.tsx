"use client";

import { Check, Lock } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useI18n } from "@/lib/i18n/context";

const TIERS = [
  { labelKey: "home.quality1080", value: 40, available: true },
  { labelKey: "home.quality2k", value: 70, available: false },
  { labelKey: "home.quality4k", value: 100, available: false },
];

export function Quality() {
  const { t } = useI18n();

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("home.qualityEyebrow")}
          title={t("home.qualityTitle")}
          description={t("home.qualityDesc")}
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.labelKey}
              className={`rounded-2xl border p-6 ${
                tier.available
                  ? "border-brand-500/40 bg-brand-500/5"
                  : "border-border-subtle bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex size-9 items-center justify-center rounded-full ${
                    tier.available
                      ? "bg-brand-500 text-white"
                      : "bg-surface-hover text-muted"
                  }`}
                >
                  {tier.available ? (
                    <Check className="size-4" strokeWidth={3} />
                  ) : (
                    <Lock className="size-4" />
                  )}
                </span>
              </div>
              <p className="mt-4 text-base font-bold text-primary">
                {t(tier.labelKey)}
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
                <div
                  className={`h-full rounded-full ${
                    tier.available
                      ? "bg-gradient-to-l from-brand-500 to-accent-500"
                      : "bg-border-strong"
                  }`}
                  style={{ width: `${tier.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
