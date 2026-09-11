"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import type { SubscriptionPlan } from "@/lib/admin/types/billing";

export function PlansView({ plans }: { plans: SubscriptionPlan[] }) {
  const { t, locale } = useI18n();

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.plans")} description={t("admin.plans.subtitle")} />

      <div className="grid gap-5 sm:grid-cols-2">
        {plans.map((plan) => (
          <Link
            key={plan.id}
            href={`/admin/plans/${plan.id}`}
            className="relative rounded-2xl border border-border-subtle bg-surface p-6 transition-all hover:-translate-y-0.5 hover:border-brand-500/40"
          >
            {plan.featured && (
              <span className="absolute -top-3 end-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-brand-500 to-accent-500 px-3 py-1 text-[11px] font-bold text-white">
                <Star className="size-3" />
                {t("subscription.mostPopular")}
              </span>
            )}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">{locale === "ar" ? plan.nameAr : plan.nameEn}</h3>
              <StatusBadge label={plan.active ? t("admin.status.active") : t("admin.status.inactive")} tone={plan.active ? "success" : "neutral"} />
            </div>
            <p className="mt-1 text-sm text-muted">{locale === "ar" ? plan.descriptionAr : plan.descriptionEn}</p>
            <p className="mt-4 text-2xl font-extrabold text-primary">
              <MoneyDisplay amount={plan.price} />
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-base p-2">
                <p className="font-bold text-primary">{plan.limits.videos}</p>
                <p className="text-muted">{t("admin.plans.videos")}</p>
              </div>
              <div className="rounded-lg bg-base p-2">
                <p className="font-bold text-primary">{plan.limits.projects}</p>
                <p className="text-muted">{t("admin.nav.projects")}</p>
              </div>
              <div className="rounded-lg bg-base p-2">
                <p className="font-bold text-primary">{plan.durationDays}</p>
                <p className="text-muted">{t("admin.plans.days")}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
