"use client";

import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";

export function JoinSection() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-xl px-5 text-center sm:px-8">
      <div className="rounded-2xl border border-border-subtle bg-surface p-8">
        <h2 className="text-lg font-bold text-primary">{t("developers.joinTitle")}</h2>
        <p className="mt-2 text-sm text-muted">{t("developers.joinDesc")}</p>
        <div className="mt-5">
          <Button href="/support" variant="outline">
            {t("developers.joinCta")}
          </Button>
        </div>
      </div>
    </div>
  );
}
