"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { GENERATION_STEP_KEYS } from "@/lib/mock/generation";

const STEP_LABEL_KEY: Record<(typeof GENERATION_STEP_KEYS)[number], string> = {
  understandingIdea: "create.genStepUnderstand",
  writingCopy: "create.genStepCopy",
  buildingScenes: "create.genStepScenes",
  choosingMotion: "create.genStepMotion",
  preparingPreview: "create.genStepPreview",
};

const STEP_INTERVAL_MS = 550;

export function GenerationProgress({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= GENERATION_STEP_KEYS.length) {
      const timeout = window.setTimeout(onDone, 400);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => setActiveIndex((i) => i + 1), STEP_INTERVAL_MS);
    return () => window.clearTimeout(timeout);
  }, [activeIndex, onDone]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="flex size-16 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-white shadow-lg shadow-brand-600/30">
        <Sparkles className="size-7" />
      </span>
      <h2 className="mt-6 text-xl font-extrabold text-primary">
        {t("create.generatingTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("create.generatingDesc")}</p>

      <ul className="mt-8 w-full space-y-3 text-start">
        {GENERATION_STEP_KEYS.map((key, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <li
              key={key}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                done || active
                  ? "border-brand-500/30 bg-brand-500/5 text-primary"
                  : "border-border-subtle bg-surface text-muted"
              }`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full ${
                  done ? "bg-emerald-500 text-white" : active ? "text-brand-400" : "text-muted"
                }`}
              >
                {done ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : active ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              {t(STEP_LABEL_KEY[key])}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
