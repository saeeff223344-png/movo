"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/auth/FormField";
import { AuthError } from "@/components/auth/AuthError";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { mapAuthErrorToKey } from "@/lib/supabase/error-messages";

export function SignupView() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const data = new FormData(event.currentTarget);
    const fullName = String(data.get("fullName") ?? "");
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(t(mapAuthErrorToKey(signUpError.message)));
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <AuthShell
      eyebrow={t("auth.signupEyebrow")}
      title={t("auth.signupTitle")}
      description={t("auth.signupDesc")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-brand-400 hover:text-brand-300">
            {t("auth.signIn")}
          </Link>
        </>
      }
    >
      <div className="mb-6 rounded-xl border border-brand-500/25 bg-brand-500/5 px-4 py-3 text-xs leading-relaxed text-secondary">
        {t("auth.verifyBanner")}
      </div>

      <AuthError message={error} />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField
          label={t("auth.fullName")}
          icon={<User />}
          name="fullName"
          type="text"
          placeholder={t("auth.fullNamePlaceholder")}
          autoComplete="name"
        />
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
          placeholder={t("auth.passwordPlaceholderSignup")}
          autoComplete="new-password"
        />

        <label className="flex items-start gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            required
            className="mt-0.5 size-4 rounded border-border-strong bg-surface accent-brand-500"
          />
          {t("auth.agreeTerms")}{" "}
          <a href="#" className="text-brand-400 hover:text-brand-300">
            {t("auth.termsLink")}
          </a>{" "}
          {t("auth.and")}{" "}
          <a href="#" className="text-brand-400 hover:text-brand-300">
            {t("auth.privacyLink")}
          </a>
        </label>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? t("common.loading") : t("auth.signupButton")}
        </Button>
      </form>
    </AuthShell>
  );
}
