"use client";

import { Gift } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";

export function TrialTeaser() {
  const { t } = useI18n();

  return (
    <section className="relative px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 rounded-[2rem] border border-border-subtle bg-surface p-10 text-center sm:flex-row sm:text-start">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-white shadow-lg shadow-brand-600/30">
          <Gift className="size-8" strokeWidth={1.8} />
        </span>
        <div className="flex-1">
          <span className="text-xs font-bold uppercase tracking-wide text-brand-400">
            {t("home.trialEyebrow")}
          </span>
          <h3 className="mt-1 text-2xl font-extrabold text-primary">
            {t("home.trialTitle")}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-secondary">
            {t("home.trialDesc")}
          </p>
        </div>
        <Button href="/signup" size="md" className="shrink-0">
          {t("home.trialCta")}
        </Button>
      </div>
    </section>
  );
}
