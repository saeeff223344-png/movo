"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";

export function AboutCta() {
  const { t, locale } = useI18n();
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section className="px-5 py-20 text-center sm:px-8">
      <h2 className="text-balance text-2xl font-extrabold text-primary sm:text-3xl">
        {t("about.ctaTitle")}
      </h2>
      <div className="mt-6">
        <Button href="/signup" size="lg">
          {t("about.ctaButton")}
          <Arrow className="size-5" />
        </Button>
      </div>
    </section>
  );
}
