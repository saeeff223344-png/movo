"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/auth/FormField";
import { AuthError } from "@/components/auth/AuthError";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { mapAuthErrorToKey } from "@/lib/supabase/error-messages";

export function ResetPasswordView() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError(t("auth.errorPasswordMismatch"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(t(mapAuthErrorToKey(updateError.message)));
      return;
    }

    router.push("/login?reset=1");
  }

  return (
    <AuthShell
      eyebrow={t("auth.resetEyebrow")}
      title={t("auth.resetTitle")}
      description={t("auth.resetDesc")}
      footer={null}
    >
      <AuthError message={error} />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField
          label={t("settings.newPassword")}
          icon={<Lock />}
          name="password"
          type="password"
          placeholder={t("auth.passwordPlaceholderSignup")}
          autoComplete="new-password"
        />
        <FormField
          label={t("settings.confirmPassword")}
          icon={<Lock />}
          name="confirmPassword"
          type="password"
          placeholder={t("auth.passwordPlaceholderSignup")}
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? t("common.loading") : t("auth.resetSubmit")}
        </Button>
      </form>
    </AuthShell>
  );
}
