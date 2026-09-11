"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import type { AIJob } from "@/lib/admin/types/production";

export function AIJobsView({ jobs }: { jobs: AIJob[] }) {
  const { t } = useI18n();
  const router = useRouter();

  const columns: DataTableColumn<AIJob>[] = [
    { key: "id", header: t("admin.table.id"), render: (j) => <span className="text-xs text-muted">{j.id}</span> },
    { key: "type", header: t("admin.table.type"), render: (j) => j.type },
    { key: "provider", header: t("admin.table.provider"), render: (j) => `${j.provider} / ${j.model}` },
    { key: "user", header: t("admin.table.user"), render: (j) => j.userName },
    {
      key: "status",
      header: t("admin.table.status"),
      render: (j) => (
        <StatusBadge
          label={t(`admin.status.${j.status}`)}
          tone={j.status === "succeeded" ? "success" : j.status === "failed" ? "danger" : "info"}
        />
      ),
    },
    { key: "cost", header: t("admin.table.cost"), render: (j) => `$${j.estimatedCostUsd}` },
    { key: "created", header: t("admin.table.created"), render: (j) => <DateDisplay value={j.createdAt} withTime /> },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.aiJobs")} description={t("admin.aiJobs.subtitle")} />
      <DataTable columns={columns} data={jobs} getRowId={(j) => j.id} onRowClick={(j) => router.push(`/admin/ai-jobs/${j.id}`)} />
    </div>
  );
}
