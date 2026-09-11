"use client";

import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export function HowToGetCode() {
  const { t } = useI18n();

  return (
    <div className="flex gap-4 rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-hover text-muted">
        <HelpCircle className="size-5" />
      </span>
      <div>
        <h3 className="text-sm font-bold text-primary">
          {t("subscription.howToGetCode")}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {t("subscription.howToGetCodeDesc")}
        </p>
        <Link
          href="/support"
          className="mt-3 inline-block text-sm font-bold text-brand-400 hover:text-brand-300"
        >
          {t("nav.support")}
        </Link>
      </div>
    </div>
  );
}
