"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function LanguageSection() {
  const { locale, setLocale, t } = useI18n();

  const options: { id: "ar" | "en"; label: string; sub: string }[] = [
    { id: "ar", label: "العربية", sub: "Right to left" },
    { id: "en", label: "English", sub: "Left to right" },
  ];

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
      <p className="mb-5 text-sm text-secondary">{t("settings.languageDesc")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLocale(opt.id)}
            className={`relative rounded-xl border p-5 text-start transition-colors ${
              locale === opt.id
                ? "border-brand-500 bg-brand-500/5"
                : "border-border-subtle hover:border-border-strong"
            }`}
          >
            {locale === opt.id && (
              <span className="absolute top-4 end-4 flex size-5 items-center justify-center rounded-full bg-brand-500 text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
            <p className="font-bold text-primary">{opt.label}</p>
            <p className="mt-1 text-xs text-muted">{opt.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
