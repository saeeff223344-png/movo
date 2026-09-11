"use client";

import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import { DetailField, DetailGrid } from "@/components/admin/ui/DetailGrid";
import type { RenderJob } from "@/lib/admin/types/production";

export function RenderJobDetailView({ job }: { job: RenderJob }) {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl">
      <AdminPageHeader title={job.id} description={job.userName} backHref="/admin/render-jobs" />
      <DetailGrid>
        <DetailField label={t("admin.nav.projects")} value={job.projectId} />
        <DetailField label={t("admin.nav.videos")} value={job.videoId ?? "—"} />
        <DetailField label={t("admin.table.resolution")} value={job.resolution} />
        <DetailField label={t("admin.table.duration")} value={`${job.durationSeconds}s`} />
        <DetailField label={t("admin.table.provider")} value={job.provider} />
        <DetailField label={t("admin.renderJobs.server")} value={job.server ?? "—"} />
        <DetailField
          label={t("admin.table.status")}
          value={<StatusBadge label={t(`admin.status.${job.status}`)} tone={job.status === "succeeded" ? "success" : job.status === "failed" ? "danger" : "info"} />}
        />
        <DetailField label={t("admin.table.cost")} value={<MoneyDisplay amount={job.costIqd} />} />
        <DetailField label={t("admin.renderJobs.renderDuration")} value={job.renderDurationMs ? `${(job.renderDurationMs / 1000).toFixed(1)}s` : "—"} />
        <DetailField label={t("admin.table.created")} value={<DateDisplay value={job.createdAt} withTime />} />
      </DetailGrid>

      {job.errorMessage && (
        <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-400">
          {job.errorMessage}
        </div>
      )}
    </div>
  );
}
