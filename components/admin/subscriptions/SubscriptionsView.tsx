"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import type { AdminSubscription } from "@/lib/admin/types/billing";

export function SubscriptionsView({ subscriptions }: { subscriptions: AdminSubscription[] }) {
  const { t } = useI18n();
  const router = useRouter();

  const columns: DataTableColumn<AdminSubscription>[] = [
    { key: "id", header: t("admin.table.id"), render: (s) => <span className="text-xs text-muted">{s.id}</span> },
    { key: "user", header: t("admin.table.user"), render: (s) => s.userName },
    { key: "plan", header: t("admin.table.plan"), render: (s) => s.planName },
    { key: "price", header: t("admin.table.price"), render: (s) => <MoneyDisplay amount={s.price} /> },
    {
      key: "status",
      header: t("admin.table.status"),
      render: (s) => (
        <StatusBadge
          label={t(`admin.status.${s.status}`)}
          tone={s.status === "active" ? "success" : s.status === "cancelled" ? "neutral" : "warning"}
        />
      ),
    },
    { key: "start", header: t("subscription.startDate"), render: (s) => <DateDisplay value={s.startDate} /> },
    { key: "expiry", header: t("subscription.expiryDate"), render: (s) => <DateDisplay value={s.expiryDate} /> },
    { key: "source", header: t("admin.table.activationSource"), render: (s) => t(`admin.activationSource.${s.activationSource}`) },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.subscriptions")} description={t("admin.subscriptions.subtitle")} />
      <DataTable
        columns={columns}
        data={subscriptions}
        getRowId={(s) => s.id}
        onRowClick={(s) => router.push(`/admin/subscriptions/${s.id}`)}
      />
    </div>
  );
}
