"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import { DetailField, DetailGrid } from "@/components/admin/ui/DetailGrid";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { AuthError } from "@/components/auth/AuthError";
import type { PaymentRecord } from "@/lib/admin/types/billing";
import { verifyPaymentAction, rejectPaymentAction } from "@/lib/admin/actions/billing-actions";

const TONE = { verified: "success", pending: "warning", rejected: "danger", refunded: "neutral" } as const;

export function PaymentDetailView({ payment }: { payment: PaymentRecord }) {
  const { t } = useI18n();
  const [record, setRecord] = useState(payment);
  const [confirmAction, setConfirmAction] = useState<"verify" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-3xl">
      <AdminPageHeader title={record.userName} description={record.id} backHref="/admin/payments" />

      <DetailGrid>
        <DetailField label={t("admin.table.plan")} value={record.planName} />
        <DetailField label={t("admin.table.amount")} value={<MoneyDisplay amount={record.amount} />} />
        <DetailField label={t("admin.table.method")} value={t(`admin.paymentMethod.${record.method}`)} />
        <DetailField label={t("admin.payments.reference")} value={record.reference ?? "—"} />
        <DetailField
          label={t("admin.table.status")}
          value={<StatusBadge label={t(`admin.status.${record.status}`)} tone={TONE[record.status]} />}
        />
        <DetailField label={t("admin.table.date")} value={<DateDisplay value={record.date} /> } />
        <DetailField label={t("admin.payments.verifiedBy")} value={record.verifiedBy ?? "—"} />
        <DetailField label={t("admin.payments.verifiedAt")} value={<DateDisplay value={record.verifiedAt} withTime />} />
      </DetailGrid>

      {record.status === "pending" && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setConfirmAction("verify")}>
            <CheckCircle2 className="size-4" />
            {t("admin.actions.verify")}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmAction("reject")}>
            <XCircle className="size-4" />
            {t("admin.actions.reject")}
          </Button>
        </div>
      )}

      {error && <AuthError message={error} />}

      <ConfirmDialog
        open={confirmAction === "verify"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          const prev = record;
          setRecord({ ...record, status: "verified", verifiedAt: new Date().toISOString() });
          void verifyPaymentAction(record.id).then((r) => {
            if (!r.ok) {
              setRecord(prev);
              setError(r.error);
            }
          });
        }}
        title={t("admin.actions.verify")}
        description={t("admin.confirm.verifyPayment")}
        confirmLabel={t("admin.actions.verify")}
      />
      <ConfirmDialog
        open={confirmAction === "reject"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          const prev = record;
          setRecord({ ...record, status: "rejected", verifiedAt: new Date().toISOString() });
          void rejectPaymentAction(record.id).then((r) => {
            if (!r.ok) {
              setRecord(prev);
              setError(r.error);
            }
          });
        }}
        title={t("admin.actions.reject")}
        description={t("admin.confirm.rejectPayment")}
        confirmLabel={t("admin.actions.reject")}
        danger
      />
    </div>
  );
}
