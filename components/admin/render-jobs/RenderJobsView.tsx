"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import type { RenderJob } from "@/lib/admin/types/production";

export function RenderJobsView({ jobs }: { jobs: RenderJob[] }) {
  const { t } = useI18n();
  const router = useRouter();

  const columns: DataTableColumn<RenderJob>[] = [
    { key: "id", header: t("admin.table.id"), render: (r) => <span className="text-xs text-muted">{r.id}</span> },
    { key: "user", header: t("admin.table.user"), render: (r) => r.userName },
    { key: "resolution", header: t("admin.table.resolution"), render: (r) => r.resolution },
    { key: "provider", header: t("admin.table.provider"), render: (r) => r.provider },
    {
      key: "status",
      header: t("admin.table.status"),
      render: (r) => (
        <StatusBadge
          label={t(`admin.status.${r.status}`)}
          tone={r.status === "succeeded" ? "success" : r.status === "failed" ? "danger" : "info"}
        />
      ),
    },
    { key: "cost", header: t("admin.table.cost"), render: (r) => <MoneyDisplay amount={r.costIqd} /> },
    { key: "created", header: t("admin.table.created"), render: (r) => <DateDisplay value={r.createdAt} withTime /> },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.renderJobs")} description={t("admin.renderJobs.subtitle")} />
      <DataTable columns={columns} data={jobs} getRowId={(r) => r.id} onRowClick={(r) => router.push(`/admin/render-jobs/${r.id}`)} />
    </div>
  );
}
