"use client";

import { useState } from "react";
import { CreditCard, Info, Languages, LifeBuoy, Shield, SunMoon, User, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { LanguageSection } from "@/components/settings/LanguageSection";
import { ThemeSection } from "@/components/settings/ThemeSection";
import { SubscriptionSection } from "@/components/settings/SubscriptionSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import type { SubscriptionStatus } from "@/lib/types/account";

const TABS = [
  { id: "profile", icon: User, labelKey: "settings.tabProfile" },
  { id: "language", icon: Languages, labelKey: "settings.tabLanguage" },
  { id: "theme", icon: SunMoon, labelKey: "settings.tabTheme" },
  { id: "subscription", icon: CreditCard, labelKey: "settings.tabSubscription" },
  { id: "security", icon: Shield, labelKey: "settings.tabSecurity" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsView({ subscription }: { subscription: SubscriptionStatus }) {
  const { t } = useI18n();
  const [active, setActive] = useState<TabId>("profile");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-sm text-secondary">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors lg:w-full ${
                active === tab.id
                  ? "bg-brand-500/10 text-brand-400"
                  : "text-secondary hover:bg-surface-hover hover:text-primary"
              }`}
            >
              <tab.icon className="size-4" strokeWidth={2} />
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <div>
          {active === "profile" && <ProfileSection />}
          {active === "language" && <LanguageSection />}
          {active === "theme" && <ThemeSection />}
          {active === "subscription" && <SubscriptionSection subscription={subscription} />}
          {active === "security" && <SecuritySection />}

          <div className="mt-8 flex flex-wrap gap-3 border-t border-border-subtle pt-6">
            {[
              { href: "/support", icon: LifeBuoy, label: t("nav.help") },
              { href: "/about", icon: Info, label: t("nav.about") },
              { href: "/developers", icon: Users, label: t("nav.developers") },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-3.5 py-2 text-xs font-semibold text-secondary transition-colors hover:border-border-strong hover:text-primary"
              >
                <link.icon className="size-3.5" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
