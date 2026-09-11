"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function WelcomeHeader({ fullName }: { fullName: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const target = prompt.trim()
      ? `/create?prompt=${encodeURIComponent(prompt.trim())}`
      : "/create";
    router.push(target);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 px-6 py-10 sm:px-10">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-15" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
          <Sparkles className="size-3.5" />
          {t("dashboard.welcomeBack")}, {fullName}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
          {t("dashboard.whatWillWeMake")}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-3 rounded-2xl bg-white/10 p-2.5 backdrop-blur-sm sm:flex-row sm:items-center"
        >
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("dashboard.miniPromptPlaceholder")}
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-white/60 outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-700 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {t("dashboard.createNew")}
            <Arrow className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
