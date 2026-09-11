"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/context";
import { useI18n } from "@/lib/i18n/context";

export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t("themeSwitch.label")}
      className={`flex size-9 items-center justify-center rounded-full border border-border-subtle bg-surface text-secondary transition-colors hover:text-primary ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="size-4" strokeWidth={2} />
      ) : (
        <Moon className="size-4" strokeWidth={2} />
      )}
    </button>
  );
}
