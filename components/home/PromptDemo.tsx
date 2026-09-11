"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Sparkles, Tag, Video } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

const CHIPS = [
  { icon: ImageIcon, labelKey: "create.assetProduct" },
  { icon: Tag, labelKey: "create.assetLogo" },
  { icon: Video, labelKey: "create.assetVideo" },
] as const;

export function PromptDemo() {
  const { t } = useI18n();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  function handleGenerate() {
    const target = prompt.trim()
      ? `/create?prompt=${encodeURIComponent(prompt.trim())}`
      : "/create";
    router.push(target);
  }

  return (
    <div className="rounded-3xl border border-border-subtle bg-elevated p-5 text-start shadow-xl shadow-black/5 sm:p-6">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder={t("home.heroPromptPlaceholder")}
        className="w-full resize-none bg-transparent text-base leading-relaxed text-primary placeholder-muted outline-none"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.labelKey}
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:border-brand-400/50 hover:text-primary"
            >
              <chip.icon className="size-3.5" />
              {t(chip.labelKey)}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-brand-500 to-accent-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <Sparkles className="size-4" />
          {t("create.generateCta")}
        </button>
      </div>
    </div>
  );
}
