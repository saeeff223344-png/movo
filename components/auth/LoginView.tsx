"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/auth/FormField";
import { AuthError } from "@/components/auth/AuthError";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { mapAuthErrorToKey } from "@/lib/supabase/error-messages";

export function LoginView() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError(t(mapAuthErrorToKey(signInError.message)));
      return;
    }

    router.push(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      eyebrow={t("auth.loginEyebrow")}
      title={t("auth.loginTitle")}
      description={t("auth.loginDesc")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link href="/signup" className="font-semibold text-brand-400 hover:text-brand-300">
            {t("auth.createAccount")}
          </Link>
        </>
      }
    >
      <AuthError message={error} />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField
          label={t("auth.email")}
          icon={<Mail />}
          name="email"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
        />
        <FormField
          label={t("auth.password")}
          icon={<Lock />}
          name="password"
          type="password"
          placeholder={t("auth.passwordPlaceholderLogin")}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-secondary">
            <input
              type="checkbox"
              className="size-4 rounded border-border-strong bg-surface accent-brand-500"
            />
            {t("auth.rememberMe")}
          </label>
          <Link href="/forgot-password" className="font-medium text-brand-400 hover:text-brand-300">
            {t("auth.forgotPassword")}
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? t("common.loading") : t("auth.loginButton")}
        </Button>
      </form>
    </AuthShell>
  );
}
