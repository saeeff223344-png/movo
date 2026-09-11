"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface p-1 text-xs font-semibold ${className}`}
      role="group"
      aria-label={t("langSwitch.label")}
    >
      <Languages className="mx-1.5 size-3.5 text-muted" />
      <button
        type="button"
        onClick={() => setLocale("ar")}
        aria-pressed={locale === "ar"}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          locale === "ar"
            ? "bg-brand-500 text-white"
            : "text-secondary hover:text-primary"
        }`}
      >
        AR
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          locale === "en"
            ? "bg-brand-500 text-white"
            : "text-secondary hover:text-primary"
        }`}
      >
        EN
      </button>
    </div>
  );
}
