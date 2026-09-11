"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, KeySquare, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { redeemActivationCode } from "@/lib/actions/redeem-code";
import type { PlanId } from "@/lib/types/account";

type DisplayStatus = "valid" | "invalid" | "used" | "expired" | "error";

export function ActivationForm({
  onActivated,
}: {
  onActivated: (plan: PlanId, expiryDate: string) => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<DisplayStatus | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setStatus(null);

    const result = await redeemActivationCode(code);
    setChecking(false);
    setStatus(result.status);

    if (result.status === "valid") {
      onActivated(result.plan, result.expiryDate);
    }
  }

  const messages: Record<DisplayStatus, { text: string; tone: string; icon: typeof CheckCircle2 }> = {
    valid: { text: t("subscription.codeValid"), tone: "text-emerald-500", icon: CheckCircle2 },
    invalid: { text: t("subscription.codeInvalid"), tone: "text-red-400", icon: XCircle },
    used: { text: t("subscription.codeUsed"), tone: "text-amber-500", icon: AlertCircle },
    expired: { text: t("subscription.codeExpired"), tone: "text-amber-500", icon: AlertCircle },
    error: { text: t("auth.errorGeneric"), tone: "text-red-400", icon: XCircle },
  };

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
      <h3 className="text-base font-bold text-primary">
        {t("subscription.activationTitle")}
      </h3>
      <p className="mt-1 text-sm text-muted">{t("subscription.activationDesc")}</p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <KeySquare className="pointer-events-none absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("subscription.activationPlaceholder")}
            className="w-full rounded-xl border border-border-subtle bg-base py-3 pe-4 ps-11 text-sm text-primary placeholder-muted outline-none transition-colors focus:border-brand-400/60"
          />
        </div>
        <Button type="submit" disabled={checking}>
          {checking ? t("common.loading") : t("subscription.activateButton")}
        </Button>
      </form>

      {status && (
        <div className={`mt-4 flex items-center gap-2 text-sm font-medium ${messages[status].tone}`}>
          {(() => {
            const Icon = messages[status].icon;
            return <Icon className="size-4" />;
          })()}
          {messages[status].text}
        </div>
      )}
    </div>
  );
}
