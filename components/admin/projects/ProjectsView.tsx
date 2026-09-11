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
import type { AdminProject, AdminProjectStatus } from "@/lib/admin/types/production";

type Filter = "all" | AdminProjectStatus;

const TONE: Record<AdminProjectStatus, "success" | "info" | "warning" | "danger" | "neutral"> = {
  ready: "success",
  generating: "info",
  planning: "info",
  rendering: "warning",
  draft: "neutral",
  failed: "danger",
};

export function ProjectsView({ projects }: { projects: AdminProject[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        const matchesQuery =
          query.trim().length === 0 ||
          p.businessName.toLowerCase().includes(query.toLowerCase()) ||
          p.ownerName.toLowerCase().includes(query.toLowerCase());
        const matchesFilter = filter === "all" || p.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [projects, query, filter],
  );

  const columns: DataTableColumn<AdminProject>[] = [
    {
      key: "business",
      header: t("admin.table.business"),
      render: (p) => (
        <div>
          <p className="font-semibold text-primary">{p.businessName}</p>
          <p className="text-xs text-muted">{p.ownerName}</p>
        </div>
      ),
    },
    { key: "platform", header: t("admin.table.platform"), render: (p) => p.platform },
    { key: "ratio", header: t("admin.table.ratio"), render: (p) => p.aspectRatio },
    { key: "duration", header: t("admin.table.duration"), render: (p) => `${p.duration}s` },
    { key: "assets", header: t("admin.table.assets"), render: (p) => p.assetsCount },
    { key: "status", header: t("admin.table.status"), render: (p) => <StatusBadge label={t(`admin.status.${p.status}`)} tone={TONE[p.status]} /> },
    { key: "created", header: t("admin.table.created"), render: (p) => <DateDisplay value={p.createdAt} /> },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.projects")} description={t("admin.projects.subtitle")} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder={t("admin.common.search")} className="w-full sm:w-72" />
        <FilterBar>
          <FilterSelect
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("admin.common.all") },
              { value: "draft", label: t("admin.status.draft") },
              { value: "planning", label: t("admin.status.planning") },
              { value: "generating", label: t("admin.status.generating") },
              { value: "rendering", label: t("admin.status.rendering") },
              { value: "ready", label: t("admin.status.ready") },
              { value: "failed", label: t("admin.status.failed") },
            ]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(p) => p.id}
        onRowClick={(p) => router.push(`/admin/projects/${p.id}`)}
      />
    </div>
  );
}
