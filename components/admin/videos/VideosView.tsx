"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import type { AdminVideo } from "@/lib/admin/types/production";

export function VideosView({ videos }: { videos: AdminVideo[] }) {
  const { t } = useI18n();
  const router = useRouter();

  const columns: DataTableColumn<AdminVideo>[] = [
    { key: "id", header: t("admin.table.id"), render: (v) => <span className="text-xs text-muted">{v.id}</span> },
    { key: "owner", header: t("admin.table.owner"), render: (v) => v.ownerName },
    { key: "duration", header: t("admin.table.duration"), render: (v) => `${v.durationSeconds}s` },
    { key: "ratio", header: t("admin.table.ratio"), render: (v) => v.aspectRatio },
    { key: "resolution", header: t("admin.table.resolution"), render: (v) => v.resolution },
    { key: "format", header: t("admin.table.format"), render: (v) => v.format.toUpperCase() },
    { key: "size", header: t("admin.videos.fileSize"), render: (v) => `${v.fileSizeMb.toFixed(1)} MB` },
    { key: "status", header: t("admin.table.status"), render: (v) => <StatusBadge label={t(`admin.status.${v.status}`)} tone={v.status === "ready" ? "success" : v.status === "failed" ? "danger" : "info"} /> },
    { key: "created", header: t("admin.table.created"), render: (v) => <DateDisplay value={v.createdAt} /> },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.videos")} description={t("admin.videos.subtitle")} />
      <DataTable columns={columns} data={videos} getRowId={(v) => v.id} onRowClick={(v) => router.push(`/admin/videos/${v.id}`)} />
    </div>
  );
}
