"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthError } from "@/components/auth/AuthError";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { mapAuthErrorToKey } from "@/lib/supabase/error-messages";

export function VerifyEmailView() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "you@example.com";
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setError(null);
    setSending(true);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });

    setSending(false);

    if (resendError) {
      setError(t(mapAuthErrorToKey(resendError.message)));
      return;
    }

    setSent(true);
    window.setTimeout(() => setSent(false), 5000);
  }

  return (
    <AuthShell
      eyebrow={t("common.brand")}
      title={t("auth.verifyTitle")}
      description=""
      footer={
        <Link href="/login" className="font-semibold text-brand-400 hover:text-brand-300">
          {t("auth.verifyBackToLogin")}
        </Link>
      }
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-white shadow-lg shadow-brand-600/30">
          <MailCheck className="size-8" strokeWidth={1.8} />
        </span>

        <p className="mt-6 text-sm text-secondary">
          {t("auth.verifyDesc")}{" "}
          <span className="font-semibold text-primary">{email}</span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {t("auth.verifyHint")}
        </p>

        {error && (
          <div className="mt-4 w-full">
            <AuthError message={error} />
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="mt-8 w-full"
          onClick={handleResend}
          disabled={sending}
        >
          {sending ? t("common.loading") : sent ? t("auth.verifyResent") : t("auth.verifyResend")}
        </Button>
      </div>
    </AuthShell>
  );
}
