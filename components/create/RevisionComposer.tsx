"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { Revision } from "@/lib/types/video";

const SUGGESTION_KEYS = [
  "revisionSuggestFaster",
  "revisionSuggestColors",
  "revisionSuggestPrice",
  "revisionSuggestLogo",
  "revisionSuggestLuxury",
] as const;

export function RevisionComposer({
  revisions,
  isApplying,
  onSubmit,
}: {
  revisions: Revision[];
  isApplying: boolean;
  onSubmit: (message: string) => void;
}) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim() || isApplying) return;
    onSubmit(message.trim());
    setMessage("");
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <h3 className="text-sm font-bold text-primary">{t("create.revisionTitle")}</h3>

      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder={t("create.revisionPlaceholder")}
          className="flex-1 resize-none rounded-xl border border-border-subtle bg-base px-3.5 py-2.5 text-sm text-primary placeholder-muted outline-none transition-colors focus:border-brand-400/60"
        />
        <button
          type="submit"
          disabled={!message.trim() || isApplying}
          aria-label={t("create.revisionSubmit")}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white transition-opacity disabled:opacity-40"
        >
          {isApplying ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGGESTION_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={isApplying}
            onClick={() => onSubmit(t(`create.${key}`))}
            className="rounded-full bg-surface-hover px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:text-primary disabled:opacity-40"
          >
            {t(`create.${key}`)}
          </button>
        ))}
      </div>

      {revisions.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border-subtle pt-4">
          {revisions.map((rev) => (
            <li key={rev.id} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="size-2.5" strokeWidth={3} />
              </span>
              <div>
                <p className="font-semibold text-primary">{rev.message}</p>
                <p className="text-muted">{rev.appliedChangeSummary}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
