"use client";

import { Mail, User } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { mockUser } from "@/lib/data/user";

export function ProfileSection() {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
      <form className="max-w-md space-y-5" onSubmit={(e) => e.preventDefault()}>
        <FormField
          label={t("settings.profileFullName")}
          icon={<User />}
          name="fullName"
          type="text"
          placeholder={mockUser.fullName}
        />
        <FormField
          label={t("settings.profileEmail")}
          icon={<Mail />}
          name="email"
          type="email"
          placeholder={mockUser.email}
        />
        <Button type="submit">{t("settings.profileSave")}</Button>
      </form>
    </div>
  );
}
