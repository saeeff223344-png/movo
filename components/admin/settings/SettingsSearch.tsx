"use client";

import { Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function SettingsSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="relative max-w-sm">
      <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("admin.settings.searchPlaceholder")}
        className="w-full rounded-xl border border-border-subtle bg-surface py-2.5 pe-4 ps-9 text-sm text-primary placeholder-muted outline-none focus:border-brand-400/60"
      />
    </div>
  );
}
