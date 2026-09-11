"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SearchBox } from "@/components/admin/ui/SearchBox";
import { FilterBar, FilterSelect } from "@/components/admin/ui/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import type { PaymentRecord, PaymentStatus } from "@/lib/admin/types/billing";

type Filter = "all" | PaymentStatus;

const TONE: Record<PaymentStatus, "success" | "warning" | "danger" | "neutral"> = {
  verified: "success",
  pending: "warning",
  rejected: "danger",
  refunded: "neutral",
};

export function PaymentsView({ payments }: { payments: PaymentRecord[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        const matchesQuery = query.trim().length === 0 || p.userName.toLowerCase().includes(query.toLowerCase());
        const matchesFilter = filter === "all" || p.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [payments, query, filter],
  );

  const columns: DataTableColumn<PaymentRecord>[] = [
    { key: "id", header: t("admin.table.id"), render: (p) => <span className="text-xs text-muted">{p.id}</span> },
    { key: "user", header: t("admin.table.user"), render: (p) => p.userName },
    { key: "plan", header: t("admin.table.plan"), render: (p) => p.planName },
    { key: "amount", header: t("admin.table.amount"), render: (p) => <MoneyDisplay amount={p.amount} /> },
    { key: "method", header: t("admin.table.method"), render: (p) => t(`admin.paymentMethod.${p.method}`) },
    {
      key: "status",
      header: t("admin.table.status"),
      render: (p) => <StatusBadge label={t(`admin.status.${p.status}`)} tone={TONE[p.status]} />,
    },
    { key: "date", header: t("admin.table.date"), render: (p) => <DateDisplay value={p.date} /> },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.payments")} description={t("admin.payments.subtitle")} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder={t("admin.common.search")} className="w-full sm:w-72" />
        <FilterBar>
          <FilterSelect
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("admin.common.all") },
              { value: "pending", label: t("admin.status.pending") },
              { value: "verified", label: t("admin.status.verified") },
              { value: "rejected", label: t("admin.status.rejected") },
            ]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(p) => p.id}
        onRowClick={(p) => router.push(`/admin/payments/${p.id}`)}
      />
    </div>
  );
}
