"use client";

import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { MetricCard } from "@/components/admin/ui/MetricCard";
import { ChartCard, MiniLineChart } from "@/components/admin/ui/ChartCard";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { formatNumber } from "@/lib/admin/utils/format";
import type { UsageSummary, UsageTopConsumer } from "@/lib/admin/types/production";

export function UsageView({ usage }: { usage: UsageSummary }) {
  const { t } = useI18n();

  const columns: DataTableColumn<UsageTopConsumer>[] = [
    { key: "user", header: t("admin.table.user"), render: (u) => u.userName },
    { key: "plan", header: t("admin.table.plan"), render: (u) => u.planName ?? "—" },
    { key: "videos", header: t("admin.table.videosUsed"), render: (u) => u.videos },
    { key: "ai", header: t("admin.metric.aiRequests"), render: (u) => u.aiRequests },
    { key: "storage", header: t("admin.usage.storage"), render: (u) => `${u.storageMb} MB` },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.usage")} description={t("admin.usage.subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label={t("admin.usage.videos")} value={formatNumber(usage.totals.videos)} />
        <MetricCard label={t("admin.metric.aiRequests")} value={formatNumber(usage.totals.aiRequests)} />
        <MetricCard label={t("admin.usage.revisions")} value={formatNumber(usage.totals.revisions)} />
        <MetricCard label={t("admin.usage.renderMinutes")} value={formatNumber(usage.totals.renderMinutes)} />
        <MetricCard label={t("admin.usage.storage")} value={`${(usage.totals.storageMb / 1024).toFixed(1)} GB`} />
      </div>

      <div className="mt-6">
        <ChartCard title={t("admin.usage.trend")}>
          <MiniLineChart data={usage.byDate.map((d) => ({ label: d.date, value: d.videos }))} />
        </ChartCard>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-primary">{t("admin.usage.topConsumers")}</h2>
        <DataTable columns={columns} data={usage.topConsumers} getRowId={(u) => u.userId} />
      </div>
    </div>
  );
}
