"use client";

import { LifeBuoy, Sparkles, Wallet, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export function QuickActions() {
  const { t } = useI18n();

  const actions = [
    { href: "/create", icon: Sparkles, label: t("dashboard.quickActionCreate") },
    { href: "/templates", icon: LayoutTemplate, label: t("dashboard.quickActionExamples") },
    { href: "/subscription", icon: Wallet, label: t("dashboard.quickActionSubscription") },
    { href: "/support", icon: LifeBuoy, label: t("dashboard.quickActionSupport") },
  ];

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-primary">
        {t("dashboard.quickActionsTitle")}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-5 text-center transition-all hover:-translate-y-1 hover:border-brand-500/40"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 transition-transform group-hover:scale-110">
              <action.icon className="size-5" strokeWidth={2} />
            </span>
            <span className="text-xs font-bold text-primary">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
