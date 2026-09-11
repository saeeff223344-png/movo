"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";

export function FinalCta() {
  const { t, locale } = useI18n();
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section className="relative px-5 py-10 sm:px-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-border-subtle bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 px-6 py-16 text-center sm:px-16">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <h2 className="text-balance text-3xl font-extrabold text-white sm:text-4xl">
            {t("home.finalCtaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-white/80">
            {t("home.finalCtaDesc")}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/signup" variant="light" size="lg">
              {t("home.finalCtaButton")}
              <Arrow className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
