"use client";

import { Calendar, KeyRound } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { formatMoney } from "@/lib/admin/utils/format";
import type { PublicPlan } from "@/lib/supabase/plans";

/**
 * Prices come from `plans` (subscription_plans — same table /admin/plans
 * manages, see lib/supabase/plans.ts). `plans === null` means the query
 * failed, not that pricing isn't decided — shown honestly, not faked.
 */
export function SubscriptionTeaser({ plans }: { plans: PublicPlan[] | null }) {
  const { t, locale } = useI18n();
  const monthly = plans?.find((p) => p.slug === "monthly") ?? null;
  const yearly = plans?.find((p) => p.slug === "yearly") ?? null;

  function priceLine(plan: PublicPlan | null) {
    if (plan) return formatMoney(plan.priceIqd);
    return plans === null ? t("subscription.priceUnavailable") : t("subscription.planUnavailable");
  }

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("home.subEyebrow")}
          title={t("home.subTitle")}
          description={t("home.subDesc")}
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border-subtle bg-surface p-7">
            <Calendar className="size-6 text-brand-400" />
            <h3 className="mt-4 text-lg font-bold text-primary">
              {monthly ? (locale === "ar" ? monthly.nameAr : monthly.nameEn) : t("home.subMonthly")}
            </h3>
            <p className="mt-1 text-sm text-muted">{priceLine(monthly)}</p>
          </div>
          <div className="relative rounded-2xl border border-brand-500/40 bg-brand-500/5 p-7">
            <span className="absolute -top-3 end-6 rounded-full bg-gradient-to-l from-brand-500 to-accent-500 px-3 py-1 text-[11px] font-bold text-white">
              {t("subscription.mostPopular")}
            </span>
            <KeyRound className="size-6 text-brand-400" />
            <h3 className="mt-4 text-lg font-bold text-primary">
              {yearly ? (locale === "ar" ? yearly.nameAr : yearly.nameEn) : t("home.subYearly")}
            </h3>
            <p className="mt-1 text-sm text-muted">{priceLine(yearly)}</p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Button href="/subscription" variant="outline">
            {t("home.subCta")}
          </Button>
        </div>
      </div>
    </section>
  );
}
