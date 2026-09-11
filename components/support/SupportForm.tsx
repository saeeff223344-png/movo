"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import { useI18n } from "@/lib/i18n/context";
import { submitSupportTicketAction } from "@/lib/actions/support-actions";

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
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !issueType || !description.trim()) return;

    setSubmitting(true);
    setError(null);
    const result = await submitSupportTicketAction({ title, issueType, description });
    setSubmitting(false);

    if (!result.ok) {
      setError(t("support.submitError"));
      return;
    }

    setTitle("");
    setIssueType("");
    setDescription("");
    setSubmitted(true);
    router.refresh();
    window.setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
      <h2 className="text-base font-bold text-primary">{t("support.formTitle")}</h2>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <AuthError message={error} />
        <div>
          <label className="mb-2 block text-sm font-medium text-secondary">
            {t("support.issueTitle")}
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("support.descriptionPlaceholder")}
            className="w-full resize-none rounded-xl border border-border-subtle bg-base px-4 py-3 text-sm text-primary placeholder-muted outline-none transition-colors focus:border-brand-400/60"
          />
        </div>

        <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
          <Send className="size-4" />
          {submitting ? t("common.loading") : submitted ? t("support.submitted") : t("support.submit")}
        </Button>
      </form>
    </div>
  );
}
