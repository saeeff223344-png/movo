"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/auth/FormField";
import { AuthError } from "@/components/auth/AuthError";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { mapAuthErrorToKey } from "@/lib/supabase/error-messages";

export function ForgotPasswordView() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(t(mapAuthErrorToKey(resetError.message)));
      return;
    }

    setSent(true);
  }

  return (
    <AuthShell
      eyebrow={t("auth.forgotEyebrow")}
      title={t("auth.forgotTitle")}
      description={t("auth.forgotDesc")}
      footer={
        <Link href="/login" className="font-semibold text-brand-400 hover:text-brand-300">
          {t("auth.verifyBackToLogin")}
        </Link>
      }
    >
      <AuthError message={error} />

      {sent ? (
        <div className="flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-white shadow-lg shadow-brand-600/30">
            <KeyRound className="size-7" strokeWidth={1.8} />
          </span>
          <p className="mt-5 text-sm text-secondary">{t("auth.forgotSent")}</p>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FormField
            label={t("auth.email")}
            icon={<Mail />}
            name="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
          />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? t("common.loading") : t("auth.forgotSubmit")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
