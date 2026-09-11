"use client";

import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { DetailField, DetailGrid } from "@/components/admin/ui/DetailGrid";
import { DetailTabs, type DetailTab } from "@/components/admin/ui/DetailTabs";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileQuestion } from "lucide-react";
import type { AdminProject, AIJob, RenderJob, AdminVideo } from "@/lib/admin/types/production";

export function ProjectDetailView({
  project,
  aiJobs,
  renderJobs,
  video,
}: {
  project: AdminProject;
  aiJobs: AIJob[];
  renderJobs: RenderJob[];
  video: AdminVideo | null;
}) {
  const { t } = useI18n();

  const totalCostUsd = aiJobs.reduce((sum, j) => sum + j.estimatedCostUsd, 0);
  const totalRenderCostIqd = renderJobs.reduce((sum, r) => sum + r.costIqd, 0);

  const overviewTab = (
    <div className="space-y-6">
      <DetailGrid>
        <DetailField label={t("admin.table.owner")} value={project.ownerName} />
        <DetailField label={t("admin.table.business")} value={project.businessName} />
        <DetailField label={t("admin.table.platform")} value={project.platform} />
        <DetailField label={t("admin.table.ratio")} value={project.aspectRatio} />
        <DetailField label={t("admin.table.duration")} value={`${project.duration}s`} />
        <DetailField label={t("admin.table.language")} value={project.language.toUpperCase()} />
        <DetailField label={t("admin.projects.style")} value={t(`create.style${project.style.charAt(0).toUpperCase()}${project.style.slice(1)}`)} />
        <DetailField label={t("admin.table.status")} value={<StatusBadge label={t(`admin.status.${project.status}`)} tone="info" />} />
        <DetailField label={t("admin.table.created")} value={<DateDisplay value={project.createdAt} />} />
      </DetailGrid>

      <div className="rounded-xl border border-border-subtle bg-surface p-4">
        <p className="mb-1 text-xs font-semibold text-muted">{t("admin.projects.originalPrompt")}</p>
        <p dir="auto" className="text-sm text-primary">{project.prompt}</p>
      </div>
    </div>
  );

  const briefTab = (
    <DetailGrid>
      <DetailField label={t("admin.projects.detectedBusiness")} value={project.businessName} />
      <DetailField label={t("admin.projects.detectedOffer")} value={project.offer ?? "—"} />
      <DetailField label={t("admin.projects.style")} value={project.style} />
      <DetailField label={t("admin.table.platform")} value={project.platform} />
      <DetailField label={t("admin.table.ratio")} value={project.aspectRatio} />
      <DetailField label={t("admin.table.duration")} value={`${project.duration}s`} />
    </DetailGrid>
  );

  const aiColumns: DataTableColumn<AIJob>[] = [
    { key: "type", header: t("admin.table.type"), render: (j) => j.type },
    { key: "provider", header: t("admin.table.provider"), render: (j) => `${j.provider} / ${j.model}` },
    { key: "status", header: t("admin.table.status"), render: (j) => <StatusBadge label={t(`admin.status.${j.status}`)} tone="info" /> },
    { key: "cost", header: t("admin.table.cost"), render: (j) => `$${j.estimatedCostUsd}` },
  ];

  const renderColumns: DataTableColumn<RenderJob>[] = [
    { key: "id", header: t("admin.table.id"), render: (r) => r.id },
    { key: "resolution", header: t("admin.table.resolution"), render: (r) => r.resolution },
    { key: "status", header: t("admin.table.status"), render: (r) => <StatusBadge label={t(`admin.status.${r.status}`)} tone="info" /> },
    { key: "cost", header: t("admin.table.cost"), render: (r) => <MoneyDisplay amount={r.costIqd} /> },
  ];

  const costTab = (
    <DetailGrid>
      <DetailField label={t("admin.projects.aiCost")} value={`$${totalCostUsd.toFixed(3)}`} />
      <DetailField label={t("admin.projects.renderCost")} value={<MoneyDisplay amount={totalRenderCostIqd} />} />
      <DetailField label={t("admin.nav.videos")} value={video ? video.id : "—"} />
    </DetailGrid>
  );

  const tabs: DetailTab[] = [
    { id: "overview", label: t("admin.tabs.overview"), content: overviewTab },
    { id: "brief", label: t("admin.projects.briefTab"), content: briefTab },
    {
      id: "scenePlan",
      label: t("admin.projects.scenePlanTab"),
      content: (
        <EmptyState icon={FileQuestion} title={t("admin.projects.scenePlanEmpty")} description={t("admin.projects.scenePlanEmptyDesc")} />
      ),
    },
    { id: "aiJobs", label: t("admin.nav.aiJobs"), content: <DataTable columns={aiColumns} data={aiJobs} getRowId={(j) => j.id} /> },
    { id: "renderJobs", label: t("admin.nav.renderJobs"), content: <DataTable columns={renderColumns} data={renderJobs} getRowId={(r) => r.id} /> },
    { id: "cost", label: t("admin.projects.costTab"), content: costTab },
  ];

  return (
    <div>
      <AdminPageHeader title={project.businessName} description={project.id} backHref="/admin/projects" />
      <DetailTabs tabs={tabs} />
    </div>
  );
}
