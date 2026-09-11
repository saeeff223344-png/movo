"use client";

import { ArrowLeft, ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { mockSubscription } from "@/lib/data/subscription";

export function SubscriptionSection() {
  const { t, locale } = useI18n();
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <Wallet className="size-5" />
          </span>
          <div>
            <p className="font-bold text-primary">
              {mockSubscription.active
                ? t("subscription.statusActive")
                : t("subscription.statusInactive")}
            </p>
            <p className="text-xs text-muted">
              {mockSubscription.active
                ? `${t("subscription.expiryDate")}: ${mockSubscription.expiryDate}`
                : t("dashboard.subInactiveDesc")}
            </p>
          </div>
        </div>
        <Button href="/subscription" variant="outline" size="sm">
          {t("dashboard.goToSubscription")}
          <Arrow className="size-4" />
        </Button>
      </div>
    </div>
  );
}
