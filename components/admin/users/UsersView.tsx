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
import type { UserAccount } from "@/lib/admin/types/users";

type StatusFilter = "all" | "active" | "suspended";

export function UsersView({ users }: { users: UserAccount[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesQuery =
        query.trim().length === 0 ||
        u.fullName.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase()) ||
        u.id.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "all" || u.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [users, query, status]);

  const columns: DataTableColumn<UserAccount>[] = [
    {
      key: "name",
      header: t("admin.table.user"),
      render: (u) => (
        <div>
          <p className="font-semibold text-primary">{u.fullName}</p>
          <p className="text-xs text-muted">{u.email}</p>
        </div>
      ),
    },
    { key: "id", header: t("admin.table.id"), render: (u) => <span className="text-xs text-muted">{u.id}</span> },
    { key: "joined", header: t("admin.table.joined"), render: (u) => <DateDisplay value={u.joinedAt} /> },
    { key: "lastActive", header: t("admin.table.lastActive"), render: (u) => <DateDisplay value={u.lastActiveAt} /> },
    {
      key: "verified",
      header: t("admin.table.verification"),
      render: (u) => (
        <StatusBadge
          label={u.emailVerified ? t("admin.common.verified") : t("admin.common.unverified")}
          tone={u.emailVerified ? "success" : "warning"}
        />
      ),
    },
    {
      key: "status",
      header: t("admin.table.status"),
      render: (u) => (
        <StatusBadge
          label={u.status === "active" ? t("admin.status.active") : t("admin.status.suspended")}
          tone={u.status === "active" ? "success" : "danger"}
        />
      ),
    },
    { key: "language", header: t("admin.table.language"), render: (u) => u.language.toUpperCase() },
    {
      key: "trial",
      header: t("admin.table.trial"),
      render: (u) => (
        <StatusBadge
          label={u.trialUsed ? t("admin.status.used") : t("admin.status.available")}
          tone={u.trialUsed ? "neutral" : "info"}
        />
      ),
    },
    {
      key: "subscription",
      header: t("admin.table.subscription"),
      render: (u) =>
        u.subscriptionActive ? (
          <StatusBadge label={u.planName ?? t("admin.status.active")} tone="success" />
        ) : (
          <StatusBadge label={t("admin.status.inactive")} tone="neutral" />
        ),
    },
    { key: "videosUsed", header: t("admin.table.videosUsed"), render: (u) => u.videosUsed },
    { key: "videosRemaining", header: t("admin.table.videosRemaining"), render: (u) => u.videosRemaining ?? "—" },
    { key: "projects", header: t("admin.table.projects"), render: (u) => u.projectsCount },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.users")} description={t("admin.users.subtitle")} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder={t("admin.common.search")} className="w-full sm:w-72" />
        <FilterBar>
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: t("admin.common.all") },
              { value: "active", label: t("admin.status.active") },
              { value: "suspended", label: t("admin.status.suspended") },
            ]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(u) => u.id}
        onRowClick={(u) => router.push(`/admin/users/${u.id}`)}
        emptyTitle={t("admin.users.empty")}
      />
    </div>
  );
}
