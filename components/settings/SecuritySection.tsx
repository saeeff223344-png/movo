"use client";

import { Lock } from "lucide-react";
import { LogOut } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";

export function SecuritySection() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
        <h3 className="mb-5 text-sm font-bold text-primary">
          {t("settings.securityChangePassword")}
        </h3>
        <form className="max-w-md space-y-5" onSubmit={(e) => e.preventDefault()}>
          <FormField
            label={t("settings.currentPassword")}
            icon={<Lock />}
            name="currentPassword"
            type="password"
          />
          <FormField
            label={t("settings.newPassword")}
            icon={<Lock />}
            name="newPassword"
            type="password"
          />
          <FormField
            label={t("settings.confirmPassword")}
            icon={<Lock />}
            name="confirmPassword"
            type="password"
          />
          <Button type="submit">{t("settings.updatePassword")}</Button>
        </form>
      </div>

      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 sm:p-8">
        <h3 className="mb-4 text-sm font-bold text-red-400">
          {t("settings.dangerZone")}
        </h3>
        <Button href="/login" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
          <LogOut className="size-4" />
          {t("settings.logoutAccount")}
        </Button>
      </div>
    </div>
  );
}
