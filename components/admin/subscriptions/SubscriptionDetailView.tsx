"use client";

import { useState } from "react";
import { CalendarPlus, Ban, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import { DetailField, DetailGrid } from "@/components/admin/ui/DetailGrid";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import type { AdminSubscription } from "@/lib/admin/types/billing";
import {
  extendSubscriptionAction,
  cancelSubscriptionAction,
  reactivateSubscriptionAction,
} from "@/lib/admin/actions/billing-actions";

export function SubscriptionDetailView({ subscription }: { subscription: AdminSubscription }) {
  const { t } = useI18n();
  const [sub, setSub] = useState(subscription);
  const [confirmAction, setConfirmAction] = useState<"extend" | "cancel" | "reactivate" | null>(null);

  return (
    <div className="max-w-3xl">
      <AdminPageHeader title={sub.userName} description={sub.id} backHref="/admin/subscriptions" />

      <DetailGrid>
        <DetailField label={t("admin.table.user")} value={`${sub.userName} — ${sub.userEmail}`} />
        <DetailField label={t("admin.table.plan")} value={sub.planName} />
        <DetailField label={t("admin.table.price")} value={<MoneyDisplay amount={sub.price} />} />
        <DetailField
          label={t("admin.table.status")}
          value={
            <StatusBadge
              label={t(`admin.status.${sub.status}`)}
              tone={sub.status === "active" ? "success" : sub.status === "cancelled" ? "neutral" : "warning"}
            />
          }
        />
        <DetailField label={t("subscription.startDate")} value={<DateDisplay value={sub.startDate} />} />
        <DetailField label={t("subscription.expiryDate")} value={<DateDisplay value={sub.expiryDate} />} />
        <DetailField label={t("admin.table.activationSource")} value={t(`admin.activationSource.${sub.activationSource}`)} />
        <DetailField label={t("admin.subscriptions.activationCode")} value={sub.activationCode ?? "—"} />
        <DetailField label={t("admin.subscriptions.activatedBy")} value={sub.activatedBy} />
        <DetailField label={t("admin.table.createdAt")} value={<DateDisplay value={sub.createdAt} />} />
        {sub.cancelledAt && <DetailField label={t("admin.subscriptions.cancelledAt")} value={<DateDisplay value={sub.cancelledAt} />} />}
        {sub.cancelReason && <DetailField label={t("admin.subscriptions.cancelReason")} value={sub.cancelReason} />}
      </DetailGrid>

      <div className="mt-6 flex flex-wrap gap-2">
        {sub.status === "active" ? (
          <>
            <Button size="sm" onClick={() => setConfirmAction("extend")}>
              <CalendarPlus className="size-4" />
              {t("admin.actions.extend")}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmAction("cancel")}>
              <Ban className="size-4" />
              {t("admin.actions.cancel")}
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => setConfirmAction("reactivate")}>
            <RotateCcw className="size-4" />
            {t("admin.actions.reactivate")}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmAction === "extend"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          const next = new Date(sub.expiryDate);
          next.setDate(next.getDate() + 30);
          setSub({ ...sub, expiryDate: next.toISOString() });
          void extendSubscriptionAction(sub.id, 30);
        }}
        title={t("admin.actions.extend")}
        description={t("admin.confirm.extendSubscription")}
        confirmLabel={t("admin.actions.extend")}
      />
      <ConfirmDialog
        open={confirmAction === "cancel"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          const reason = t("admin.confirm.cancelledByAdmin");
          setSub({ ...sub, status: "cancelled", cancelledAt: new Date().toISOString(), cancelReason: reason });
          void cancelSubscriptionAction(sub.id, reason);
        }}
        title={t("admin.actions.cancel")}
        description={t("admin.confirm.cancelSubscription")}
        confirmLabel={t("admin.actions.cancel")}
        danger
      />
      <ConfirmDialog
        open={confirmAction === "reactivate"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          setSub({ ...sub, status: "active", cancelledAt: null, cancelReason: null });
          void reactivateSubscriptionAction(sub.id);
        }}
        title={t("admin.actions.reactivate")}
        description={t("admin.confirm.reactivateSubscription")}
        confirmLabel={t("admin.actions.reactivate")}
      />
    </div>
  );
}
