"use client";

import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { DetailField, DetailGrid } from "@/components/admin/ui/DetailGrid";
import type { AIJob } from "@/lib/admin/types/production";

export function AIJobDetailView({ job }: { job: AIJob }) {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl">
      <AdminPageHeader title={job.type} description={job.id} backHref="/admin/ai-jobs" />
      <DetailGrid>
        <DetailField label={t("admin.table.provider")} value={`${job.provider} / ${job.model}`} />
        <DetailField label={t("admin.table.user")} value={job.userName} />
        <DetailField label={t("admin.nav.projects")} value={job.projectId ?? "—"} />
        <DetailField
          label={t("admin.table.status")}
          value={<StatusBadge label={t(`admin.status.${job.status}`)} tone={job.status === "succeeded" ? "success" : job.status === "failed" ? "danger" : "info"} />}
        />
        <DetailField label={t("admin.aiJobs.tokens")} value={job.tokensUsed ?? "—"} />
        <DetailField label={t("admin.aiJobs.units")} value={job.generatedUnits ?? "—"} />
        <DetailField label={t("admin.aiJobs.duration")} value={`${job.durationMs} ms`} />
        <DetailField label={t("admin.table.cost")} value={`$${job.estimatedCostUsd} (${job.estimatedCostIqd} IQD)`} />
        <DetailField label={t("admin.table.created")} value={<DateDisplay value={job.createdAt} withTime />} />
      </DetailGrid>

      <div className="mt-4 rounded-xl border border-border-subtle bg-surface p-4">
        <p className="mb-1 text-xs font-semibold text-muted">{t("admin.aiJobs.inputSummary")}</p>
        <p dir="auto" className="text-sm text-primary">{job.inputSummary}</p>
      </div>

      {job.errorMessage && (
        <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-400">
          {job.errorMessage}
        </div>
      )}
    </div>
  );
}
