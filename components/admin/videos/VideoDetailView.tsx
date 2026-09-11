"use client";

import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { DetailField, DetailGrid } from "@/components/admin/ui/DetailGrid";
import type { AdminVideo } from "@/lib/admin/types/production";

export function VideoDetailView({ video }: { video: AdminVideo }) {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl">
      <AdminPageHeader title={video.id} description={video.ownerName} backHref="/admin/videos" />
      <div className="mb-6 aspect-video overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br from-brand-600 to-accent-500" />
      <DetailGrid>
        <DetailField label={t("admin.table.owner")} value={video.ownerName} />
        <DetailField label={t("admin.nav.projects")} value={video.projectId} />
        <DetailField label={t("admin.table.duration")} value={`${video.durationSeconds}s`} />
        <DetailField label={t("admin.table.ratio")} value={video.aspectRatio} />
        <DetailField label={t("admin.table.resolution")} value={video.resolution} />
        <DetailField label={t("admin.table.format")} value={video.format.toUpperCase()} />
        <DetailField label={t("admin.videos.fileSize")} value={`${video.fileSizeMb.toFixed(1)} MB`} />
        <DetailField label={t("admin.table.status")} value={<StatusBadge label={t(`admin.status.${video.status}`)} tone="success" />} />
        <DetailField label={t("admin.table.created")} value={<DateDisplay value={video.createdAt} withTime />} />
      </DetailGrid>
    </div>
  );
}
