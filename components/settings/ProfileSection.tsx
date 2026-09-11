"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, User } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import { useI18n } from "@/lib/i18n/context";
import { updateProfileAction } from "@/lib/actions/profile-actions";

export function ProfileSection({ profile }: { profile: { fullName: string; email: string } }) {
  const { t } = useI18n();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const fullName = String(data.get("fullName") ?? "");
    const email = String(data.get("email") ?? "");

    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await updateProfileAction({ fullName, email });
    setSaving(false);

    if (!result.ok) {
      setError(t("settings.profileSaveError"));
      return;
    }

    setMessage(result.emailChangePending ? t("settings.profileEmailPending") : t("settings.profileSaved"));
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
      <form className="max-w-md space-y-5" onSubmit={handleSubmit}>
        <AuthError message={error} />
        {message && <p className="text-sm font-semibold text-emerald-500">{message}</p>}
        <FormField
          label={t("settings.profileFullName")}
          icon={<User />}
          name="fullName"
          type="text"
          defaultValue={profile.fullName}
        />
        <FormField
          label={t("settings.profileEmail")}
          icon={<Mail />}
          name="email"
          type="email"
          defaultValue={profile.email}
        />
        <Button type="submit" disabled={saving}>
          {saving ? t("common.loading") : t("settings.profileSave")}
        </Button>
      </form>
    </div>
  );
}
