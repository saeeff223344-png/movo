"use client";

import { ArrowLeft, ArrowRight, Film, Wallet } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { mockTrial } from "@/lib/data/trial";
import { mockSubscription } from "@/lib/data/subscription";

export function StatusCards() {
  const { t, locale } = useI18n();
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="rounded-2xl border border-border-subtle bg-surface p-6">
        <div className="flex items-center justify-between">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <Film className="size-5" strokeWidth={2} />
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              mockTrial.used
                ? "bg-amber-500/15 text-amber-500"
                : "bg-emerald-500/15 text-emerald-500"
            }`}
          >
            {mockTrial.used
              ? t("dashboard.trialUsed")
              : t("dashboard.trialAvailable")}
          </span>
        </div>
        <h3 className="mt-4 text-sm font-bold text-primary">
          {t("dashboard.trialCardTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {mockTrial.used
            ? t("dashboard.trialUsedDesc")
            : t("dashboard.trialAvailableDesc")}
        </p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-6">
        <div className="flex items-center justify-between">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <Wallet className="size-5" strokeWidth={2} />
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              mockSubscription.active
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-white/10 text-muted"
            }`}
          >
            {mockSubscription.active
              ? t("dashboard.subActive")
              : t("dashboard.subInactive")}
          </span>
        </div>
        <h3 className="mt-4 text-sm font-bold text-primary">
          {t("dashboard.subCardTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {mockSubscription.active
            ? `${t("dashboard.subExpiresOn")}: ${mockSubscription.expiryDate}`
            : t("dashboard.subInactiveDesc")}
        </p>
        <Link
          href="/subscription"
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300"
        >
          {t("dashboard.goToSubscription")}
          <Arrow className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
