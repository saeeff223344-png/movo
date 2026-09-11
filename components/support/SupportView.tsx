"use client";

import { useI18n } from "@/lib/i18n/context";
import { SupportForm } from "@/components/support/SupportForm";
import { RequestsList } from "@/components/support/RequestsList";

export function SupportView() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-primary sm:text-4xl">
          {t("support.title")}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-secondary">{t("support.subtitle")}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <SupportForm />
        <RequestsList />
      </div>
    </div>
  );
}
