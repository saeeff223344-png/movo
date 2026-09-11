"use client";

import { Calendar, Check, KeyRound } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { PlanId } from "@/lib/data/subscription";

export function PlanCards({ activePlan }: { activePlan: PlanId | null }) {
  const { t } = useI18n();

  const plans: {
    id: PlanId;
    icon: typeof Calendar;
    titleKey: string;
    descKey: string;
    popular?: boolean;
  }[] = [
    {
      id: "monthly",
      icon: Calendar,
      titleKey: "subscription.planMonthly",
      descKey: "subscription.planMonthlyDesc",
    },
    {
      id: "yearly",
      icon: KeyRound,
      titleKey: "subscription.planYearly",
      descKey: "subscription.planYearlyDesc",
      popular: true,
    },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`relative rounded-2xl border p-7 ${
            activePlan === plan.id
              ? "border-brand-500 bg-brand-500/5"
              : "border-border-subtle bg-surface"
          }`}
        >
          {plan.popular && (
            <span className="absolute -top-3 end-6 rounded-full bg-gradient-to-l from-brand-500 to-accent-500 px-3 py-1 text-[11px] font-bold text-white">
              {t("subscription.mostPopular")}
            </span>
          )}
          {activePlan === plan.id && (
            <span className="absolute top-6 end-6 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          )}
          <plan.icon className="size-6 text-brand-400" />
          <h3 className="mt-4 text-lg font-bold text-primary">{t(plan.titleKey)}</h3>
          <p className="mt-1 text-sm text-muted">{t(plan.descKey)}</p>
          <p className="mt-5 text-sm font-semibold text-brand-400">
            {t("subscription.priceTbd")}
          </p>
        </div>
      ))}
    </div>
  );
}
