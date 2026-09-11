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
import type { AdminSupportTicket, SupportStatus } from "@/lib/admin/types/support";

type Filter = "all" | SupportStatus;

const TONE: Record<SupportStatus, "info" | "warning" | "success" | "neutral"> = {
  open: "info",
  in_progress: "warning",
  waiting_user: "warning",
  resolved: "success",
  closed: "neutral",
};

const PRIORITY_TONE = { low: "neutral", normal: "info", high: "warning", urgent: "danger" } as const;

export function SupportTicketsView({ tickets }: { tickets: AdminSupportTicket[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () =>
      tickets.filter((tk) => {
        const matchesQuery = query.trim().length === 0 || tk.subject.toLowerCase().includes(query.toLowerCase()) || tk.userName.toLowerCase().includes(query.toLowerCase());
        const matchesFilter = filter === "all" || tk.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [tickets, query, filter],
  );

  const columns: DataTableColumn<AdminSupportTicket>[] = [
    { key: "id", header: t("admin.table.id"), render: (tk) => <span className="text-xs text-muted">{tk.id}</span> },
    {
      key: "subject",
      header: t("admin.table.subject"),
      render: (tk) => (
        <div>
          <p className="font-semibold text-primary">{tk.subject}</p>
          <p className="text-xs text-muted">{tk.userName}</p>
        </div>
      ),
    },
    { key: "category", header: t("admin.table.category"), render: (tk) => t(`admin.supportCategory.${tk.category}`) },
    { key: "priority", header: t("admin.table.priority"), render: (tk) => <StatusBadge label={t(`admin.priority.${tk.priority}`)} tone={PRIORITY_TONE[tk.priority]} /> },
    { key: "status", header: t("admin.table.status"), render: (tk) => <StatusBadge label={t(`admin.status.${tk.status}`)} tone={TONE[tk.status]} /> },
    { key: "assigned", header: t("admin.support.assigned"), render: (tk) => tk.assignedAdmin ?? "—" },
    { key: "lastReply", header: t("admin.support.lastReply"), render: (tk) => <DateDisplay value={tk.lastReplyAt} withTime /> },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.support")} description={t("admin.support.subtitle")} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder={t("admin.common.search")} className="w-full sm:w-72" />
        <FilterBar>
          <FilterSelect
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("admin.common.all") },
              { value: "open", label: t("admin.status.open") },
              { value: "in_progress", label: t("admin.status.in_progress") },
              { value: "waiting_user", label: t("admin.status.waiting_user") },
              { value: "resolved", label: t("admin.status.resolved") },
              { value: "closed", label: t("admin.status.closed") },
            ]}
          />
        </FilterBar>
      </div>

      <DataTable columns={columns} data={filtered} getRowId={(tk) => tk.id} onRowClick={(tk) => router.push(`/admin/support/${tk.id}`)} />
    </div>
  );
}
