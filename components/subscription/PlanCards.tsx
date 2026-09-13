"use client";

import { Calendar, Check, KeyRound } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { formatMoney } from "@/lib/admin/utils/format";
import type { PlanId } from "@/lib/types/account";
import type { PublicPlan } from "@/lib/supabase/plans";

/**
 * Prices, names and descriptions come from `plans` (read from
 * subscription_plans — see lib/supabase/plans.ts, same table
 * /admin/plans reads and writes) — never hardcoded here. `plans === null`
 * means the query itself failed (not "no plans yet"); that state gets an
 * honest "unavailable" message rather than a fabricated price.
 */
export function PlanCards({ activePlan, plans }: { activePlan: PlanId | null; plans: PublicPlan[] | null }) {
  const { t, locale } = useI18n();

  const slots: { id: PlanId; icon: typeof Calendar; popular?: boolean }[] = [
    { id: "monthly", icon: Calendar },
    { id: "yearly", icon: KeyRound, popular: true },
  ];

  // Computed live from the same admin-configurable prices the cards
  // themselves render — never a separate hardcoded "save X" figure that
  // could drift from the real prices if they change in /admin/plans.
  const monthlyPlan = plans?.find((p) => p.slug === "monthly") ?? null;
  const yearlyPlan = plans?.find((p) => p.slug === "yearly") ?? null;
  const annualSavingsIqd = monthlyPlan && yearlyPlan ? monthlyPlan.priceIqd * 12 - yearlyPlan.priceIqd : null;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {slots.map((slot) => {
        const plan = plans?.find((p) => p.slug === slot.id) ?? null;

        return (
          <div
            key={slot.id}
            className={`relative rounded-2xl border p-7 ${
              activePlan === slot.id
                ? "border-brand-500 bg-brand-500/5"
                : "border-border-subtle bg-surface"
            }`}
          >
            {slot.popular && (
              <span className="absolute -top-3 end-6 rounded-full bg-gradient-to-l from-brand-500 to-accent-500 px-3 py-1 text-[11px] font-bold text-white">
                {t("subscription.mostPopular")}
              </span>
            )}
            {activePlan === slot.id && (
              <span className="absolute top-6 end-6 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
            )}
            <slot.icon className="size-6 text-brand-400" />
            <h3 className="mt-4 text-lg font-bold text-primary">
              {plan ? (locale === "ar" ? plan.nameAr : plan.nameEn) : t(`subscription.plan${slot.id === "monthly" ? "Monthly" : "Yearly"}`)}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {plan
                ? locale === "ar"
                  ? plan.descriptionAr
                  : plan.descriptionEn
                : t(`subscription.plan${slot.id === "monthly" ? "Monthly" : "Yearly"}Desc`)}
            </p>
            <p className="mt-5 text-sm font-semibold text-brand-400">
              {plan ? formatMoney(plan.priceIqd) : plans === null ? t("subscription.priceUnavailable") : t("subscription.planUnavailable")}
            </p>
            {slot.id === "yearly" && annualSavingsIqd !== null && annualSavingsIqd > 0 && (
              <p className="mt-1 text-xs font-semibold text-emerald-500">
                {t("subscription.annualSavings").replace("{amount}", formatMoney(annualSavingsIqd))}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
