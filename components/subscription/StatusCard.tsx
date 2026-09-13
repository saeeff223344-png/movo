"use client";

import { CalendarCheck, CalendarClock, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { formatDate } from "@/lib/admin/utils/format";
import type { SubscriptionStatus } from "@/lib/types/account";

export function StatusCard({ subscription }: { subscription: SubscriptionStatus }) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
      <div className="flex items-center gap-4">
        <span className="flex size-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
          <Wallet className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold text-muted">
            {t("subscription.statusTitle")}
          </p>
          <p
            className={`text-lg font-extrabold ${
              subscription.active ? "text-emerald-500" : "text-primary"
            }`}
          >
            {subscription.active
              ? t("subscription.statusActive")
              : t("subscription.statusInactive")}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl bg-base p-4">
          <CalendarCheck className="size-4 text-muted" />
          <div>
            <p className="text-xs text-muted">{t("subscription.startDate")}</p>
            <p className="text-sm font-semibold text-primary">
              {subscription.startDate ? formatDate(subscription.startDate) : t("common.placeholder")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-base p-4">
          <CalendarClock className="size-4 text-muted" />
          <div>
            <p className="text-xs text-muted">{t("subscription.expiryDate")}</p>
            <p className="text-sm font-semibold text-primary">
              {subscription.expiryDate ? formatDate(subscription.expiryDate) : t("common.placeholder")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
