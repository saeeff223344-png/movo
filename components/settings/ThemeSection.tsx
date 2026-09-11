"use client";

import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/context";
import { useI18n } from "@/lib/i18n/context";

export function ThemeSection() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  const options = [
    { id: "dark" as const, label: t("themeSwitch.dark"), icon: Moon },
    { id: "light" as const, label: t("themeSwitch.light"), icon: Sun },
  ];

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
      <p className="mb-5 text-sm text-secondary">{t("settings.themeDesc")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`relative flex items-center gap-4 rounded-xl border p-5 text-start transition-colors ${
              theme === opt.id
                ? "border-brand-500 bg-brand-500/5"
                : "border-border-subtle hover:border-border-strong"
            }`}
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-surface-hover text-primary">
              <opt.icon className="size-5" />
            </span>
            <p className="font-bold text-primary">{opt.label}</p>
            {theme === opt.id && (
              <span className="absolute top-4 end-4 flex size-5 items-center justify-center rounded-full bg-brand-500 text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
