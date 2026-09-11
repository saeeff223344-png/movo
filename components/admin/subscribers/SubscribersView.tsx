"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SearchBox } from "@/components/admin/ui/SearchBox";
import { FilterBar, FilterSelect } from "@/components/admin/ui/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import { daysRemaining } from "@/lib/admin/utils/format";
import type { AdminSubscription } from "@/lib/admin/types/billing";

type Filter = "all" | "monthly" | "yearly" | "active" | "expired" | "expiring" | "cancelled";

export function SubscribersView({ subscriptions }: { subscriptions: AdminSubscription[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchesQuery =
        query.trim().length === 0 ||
        s.userName.toLowerCase().includes(query.toLowerCase()) ||
        s.userEmail.toLowerCase().includes(query.toLowerCase());

      const remaining = daysRemaining(s.expiryDate);
      const matchesFilter =
        filter === "all" ||
        (filter === "monthly" && s.planName.includes("شهري")) ||
        (filter === "yearly" && s.planName.includes("سنوي")) ||
        (filter === "active" && s.status === "active") ||
        (filter === "expired" && s.status === "expired") ||
        (filter === "cancelled" && s.status === "cancelled") ||
        (filter === "expiring" && s.status === "active" && remaining <= 14 && remaining >= 0);

      return matchesQuery && matchesFilter;
    });
  }, [subscriptions, query, filter]);

  const columns: DataTableColumn<AdminSubscription>[] = [
    {
      key: "user",
      header: t("admin.table.user"),
      render: (s) => (
        <div>
          <p className="font-semibold text-primary">{s.userName}</p>
          <p className="text-xs text-muted">{s.userEmail}</p>
        </div>
      ),
    },
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
    {
      key: "daysLeft",
      header: t("admin.table.daysLeft"),
      render: (s) => (s.status === "active" ? Math.max(0, daysRemaining(s.expiryDate)) : "—"),
    },
    {
      key: "source",
      header: t("admin.table.activationSource"),
      render: (s) => t(`admin.activationSource.${s.activationSource}`),
    },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.subscribers")} description={t("admin.subscribers.subtitle")} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder={t("admin.common.search")} className="w-full sm:w-72" />
        <FilterBar>
          <FilterSelect
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("admin.common.all") },
              { value: "monthly", label: t("subscription.planMonthly") },
              { value: "yearly", label: t("subscription.planYearly") },
              { value: "active", label: t("admin.status.active") },
              { value: "expiring", label: t("admin.common.expiringSoon") },
              { value: "expired", label: t("admin.status.expired") },
              { value: "cancelled", label: t("admin.status.cancelled") },
            ]}
          />
        </FilterBar>
      </div>

      <DataTable columns={columns} data={filtered} getRowId={(s) => s.id} emptyTitle={t("admin.subscribers.empty")} />
    </div>
  );
}
