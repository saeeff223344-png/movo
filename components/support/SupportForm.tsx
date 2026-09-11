"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";

const ISSUE_TYPES = [
  "issueTypeAccount",
  "issueTypeSubscription",
  "issueTypeVideo",
  "issueTypeExport",
  "issueTypeTechnical",
  "issueTypeOther",
] as const;

export function SupportForm() {
  const { t } = useI18n();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
      <h2 className="text-base font-bold text-primary">{t("support.formTitle")}</h2>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-secondary">
            {t("support.issueTitle")}
          </label>
          <input
            required
            placeholder={t("support.issueTitlePlaceholder")}
            className="w-full rounded-xl border border-border-subtle bg-base px-4 py-3 text-sm text-primary placeholder-muted outline-none transition-colors focus:border-brand-400/60"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-secondary">
            {t("support.issueType")}
          </label>
          <select
            required
            defaultValue=""
            className="w-full rounded-xl border border-border-subtle bg-base px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-brand-400/60"
          >
            <option value="" disabled>
              {t("support.issueType")}
            </option>
            {ISSUE_TYPES.map((key) => (
              <option key={key} value={key}>
                {t(`support.${key}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-secondary">
            {t("support.description")}
          </label>
          <textarea
            required
            rows={5}
            placeholder={t("support.descriptionPlaceholder")}
            className="w-full resize-none rounded-xl border border-border-subtle bg-base px-4 py-3 text-sm text-primary placeholder-muted outline-none transition-colors focus:border-brand-400/60"
          />
        </div>

        <Button type="submit" className="w-full sm:w-auto">
          <Send className="size-4" />
          {submitted ? t("common.loading") : t("support.submit")}
        </Button>
      </form>
    </div>
  );
}
