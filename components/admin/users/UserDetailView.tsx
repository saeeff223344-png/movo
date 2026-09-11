"use client";

import { useState } from "react";
import { Ban, CheckCircle2, FolderKanban, Gift, RotateCcw, StickyNote } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import { DetailField, DetailGrid } from "@/components/admin/ui/DetailGrid";
import { DetailTabs, type DetailTab } from "@/components/admin/ui/DetailTabs";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { grantTrialAction, resetTrialAction } from "@/lib/admin/actions/trial-actions";
import { suspendUserAction, unsuspendUserAction } from "@/lib/admin/actions/user-actions";
import type { UserAccount, AdminNote } from "@/lib/admin/types/users";
import type { TrialRecord, AdminSubscription, PaymentRecord } from "@/lib/admin/types/billing";
import type { AdminProject, AdminVideo, AIJob, RenderJob } from "@/lib/admin/types/production";
import type { AdminSupportTicket } from "@/lib/admin/types/support";

export function UserDetailView({
  user,
  trial,
  subscriptions,
  payments,
  projects,
  videos,
  aiJobs,
  renderJobs,
  tickets,
  notes,
}: {
  user: UserAccount;
  trial: TrialRecord | undefined;
  subscriptions: AdminSubscription[];
  payments: PaymentRecord[];
  projects: AdminProject[];
  videos: AdminVideo[];
  aiJobs: AIJob[];
  renderJobs: RenderJob[];
  tickets: AdminSupportTicket[];
  notes: AdminNote[];
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState(user.status);
  const [trialUsed, setTrialUsed] = useState(trial?.used ?? false);
  const [noteText, setNoteText] = useState("");
  const [localNotes, setLocalNotes] = useState(notes);
  const [confirmAction, setConfirmAction] = useState<"suspend" | "unsuspend" | "grantTrial" | "resetTrial" | null>(null);

  const overviewTab = (
    <div className="space-y-6">
      <DetailGrid>
        <DetailField label={t("admin.table.id")} value={user.id} />
        <DetailField label={t("admin.table.language")} value={user.language.toUpperCase()} />
        <DetailField label={t("admin.table.joined")} value={<DateDisplay value={user.joinedAt} />} />
        <DetailField label={t("admin.table.lastActive")} value={<DateDisplay value={user.lastActiveAt} withTime />} />
        <DetailField
          label={t("admin.table.verification")}
          value={
            <StatusBadge
              label={user.emailVerified ? t("admin.common.verified") : t("admin.common.unverified")}
              tone={user.emailVerified ? "success" : "warning"}
            />
          }
        />
        <DetailField
          label={t("admin.table.status")}
          value={
            <StatusBadge
              label={status === "active" ? t("admin.status.active") : t("admin.status.suspended")}
              tone={status === "active" ? "success" : "danger"}
            />
          }
        />
      </DetailGrid>

      <div className="flex flex-wrap gap-2">
        {status === "active" ? (
          <Button variant="danger" size="sm" onClick={() => setConfirmAction("suspend")}>
            <Ban className="size-4" />
            {t("admin.actions.suspend")}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setConfirmAction("unsuspend")}>
            <CheckCircle2 className="size-4" />
            {t("admin.actions.unsuspend")}
          </Button>
        )}
        {trialUsed ? (
          <Button variant="outline" size="sm" onClick={() => setConfirmAction("resetTrial")}>
            <RotateCcw className="size-4" />
            {t("admin.actions.resetTrial")}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirmAction("grantTrial")}>
            <Gift className="size-4" />
            {t("admin.actions.grantTrial")}
          </Button>
        )}
      </div>
    </div>
  );

  const subscriptionTab =
    subscriptions.length === 0 ? (
      <EmptyState icon={FolderKanban} title={t("admin.users.noSubscriptions")} description="" />
    ) : (
      <div className="space-y-3">
        {subscriptions.map((sub) => (
          <div key={sub.id} className="rounded-xl border border-border-subtle bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-primary">{sub.planName}</p>
              <StatusBadge
                label={t(`admin.status.${sub.status}`)}
                tone={sub.status === "active" ? "success" : sub.status === "cancelled" ? "neutral" : "warning"}
              />
            </div>
            <div className="mt-2 grid gap-2 text-xs text-muted sm:grid-cols-3">
              <span>{t("subscription.startDate")}: <DateDisplay value={sub.startDate} /></span>
              <span>{t("subscription.expiryDate")}: <DateDisplay value={sub.expiryDate} /></span>
              <span><MoneyDisplay amount={sub.price} /></span>
            </div>
          </div>
        ))}
      </div>
    );

  const trialTab = (
    <DetailGrid>
      <DetailField
        label={t("admin.table.trial")}
        value={
          <StatusBadge
            label={trialUsed ? t("admin.status.used") : t("admin.status.available")}
            tone={trialUsed ? "neutral" : "info"}
          />
        }
      />
      <DetailField label={t("admin.trials.usedAt")} value={<DateDisplay value={trial?.usedAt ?? null} />} />
      <DetailField label={t("admin.trials.resetCount")} value={trial?.resetCount ?? 0} />
    </DetailGrid>
  );

  const usageTab = (
    <DetailGrid>
      <DetailField label={t("admin.table.videosUsed")} value={user.videosUsed} />
      <DetailField label={t("admin.table.videosRemaining")} value={user.videosRemaining ?? "—"} />
      <DetailField label={t("admin.table.projects")} value={user.projectsCount} />
    </DetailGrid>
  );

  const projectColumns: DataTableColumn<AdminProject>[] = [
    { key: "business", header: t("admin.table.business"), render: (p) => p.businessName },
    { key: "status", header: t("admin.table.status"), render: (p) => <StatusBadge label={t(`admin.status.${p.status}`)} tone="info" /> },
    { key: "created", header: t("admin.table.created"), render: (p) => <DateDisplay value={p.createdAt} /> },
  ];

  const videoColumns: DataTableColumn<AdminVideo>[] = [
    { key: "id", header: t("admin.table.id"), render: (v) => v.id },
    { key: "resolution", header: t("admin.table.resolution"), render: (v) => v.resolution },
    { key: "created", header: t("admin.table.created"), render: (v) => <DateDisplay value={v.createdAt} /> },
  ];

  const aiColumns: DataTableColumn<AIJob>[] = [
    { key: "type", header: t("admin.table.type"), render: (j) => j.type },
    { key: "status", header: t("admin.table.status"), render: (j) => <StatusBadge label={t(`admin.status.${j.status}`)} tone="info" /> },
    { key: "cost", header: t("admin.table.cost"), render: (j) => `$${j.estimatedCostUsd}` },
  ];

  const renderColumns: DataTableColumn<RenderJob>[] = [
    { key: "id", header: t("admin.table.id"), render: (r) => r.id },
    { key: "status", header: t("admin.table.status"), render: (r) => <StatusBadge label={t(`admin.status.${r.status}`)} tone="info" /> },
    { key: "cost", header: t("admin.table.cost"), render: (r) => <MoneyDisplay amount={r.costIqd} /> },
  ];

  const paymentColumns: DataTableColumn<PaymentRecord>[] = [
    { key: "amount", header: t("admin.table.amount"), render: (p) => <MoneyDisplay amount={p.amount} /> },
    { key: "method", header: t("admin.table.method"), render: (p) => t(`admin.paymentMethod.${p.method}`) },
    { key: "status", header: t("admin.table.status"), render: (p) => <StatusBadge label={t(`admin.status.${p.status}`)} tone="info" /> },
    { key: "date", header: t("admin.table.date"), render: (p) => <DateDisplay value={p.date} /> },
  ];

  const ticketColumns: DataTableColumn<AdminSupportTicket>[] = [
    { key: "subject", header: t("admin.table.subject"), render: (tk) => tk.subject },
    { key: "status", header: t("admin.table.status"), render: (tk) => <StatusBadge label={t(`admin.status.${tk.status}`)} tone="info" /> },
    { key: "created", header: t("admin.table.created"), render: (tk) => <DateDisplay value={tk.createdAt} /> },
  ];

  const notesTab = (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder={t("admin.notes.placeholder")}
          className="flex-1 rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-primary placeholder-muted outline-none focus:border-brand-400/60"
        />
        <Button
          size="sm"
          onClick={() => {
            if (!noteText.trim()) return;
            setLocalNotes((prev) => [
              { id: `note_${Date.now()}`, author: "المدير العام", createdAt: new Date().toISOString(), note: noteText.trim() },
              ...prev,
            ]);
            setNoteText("");
          }}
        >
          <StickyNote className="size-4" />
          {t("admin.notes.add")}
        </Button>
      </div>
      {localNotes.length === 0 ? (
        <p className="text-sm text-muted">{t("admin.notes.empty")}</p>
      ) : (
        <div className="space-y-2">
          {localNotes.map((note) => (
            <div key={note.id} className="rounded-xl border border-border-subtle bg-surface p-3.5 text-sm">
              <p className="text-primary">{note.note}</p>
              <p className="mt-1.5 text-xs text-muted">
                {note.author} · <DateDisplay value={note.createdAt} withTime />
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted">{t("admin.notes.privateHint")}</p>
    </div>
  );

  const tabs: DetailTab[] = [
    { id: "overview", label: t("admin.tabs.overview"), content: overviewTab },
    { id: "subscription", label: t("nav.subscription"), content: subscriptionTab },
    { id: "trial", label: t("admin.tabs.trial"), content: trialTab },
    { id: "usage", label: t("admin.nav.usage"), content: usageTab },
    {
      id: "projects",
      label: t("admin.nav.projects"),
      content: <DataTable columns={projectColumns} data={projects} getRowId={(p) => p.id} />,
    },
    {
      id: "videos",
      label: t("admin.nav.videos"),
      content: <DataTable columns={videoColumns} data={videos} getRowId={(v) => v.id} />,
    },
    {
      id: "aiJobs",
      label: t("admin.nav.aiJobs"),
      content: <DataTable columns={aiColumns} data={aiJobs} getRowId={(j) => j.id} />,
    },
    {
      id: "renders",
      label: t("admin.nav.renderJobs"),
      content: <DataTable columns={renderColumns} data={renderJobs} getRowId={(r) => r.id} />,
    },
    {
      id: "payments",
      label: t("admin.nav.payments"),
      content: <DataTable columns={paymentColumns} data={payments} getRowId={(p) => p.id} />,
    },
    {
      id: "support",
      label: t("nav.support"),
      content: <DataTable columns={ticketColumns} data={tickets} getRowId={(tk) => tk.id} />,
    },
    { id: "notes", label: t("admin.tabs.adminNotes"), content: notesTab },
  ];

  return (
    <div>
      <AdminPageHeader title={user.fullName} description={user.email} backHref="/admin/users" />
      <DetailTabs tabs={tabs} />

      <ConfirmDialog
        open={confirmAction === "suspend"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          setStatus("suspended");
          void suspendUserAction(user.id);
        }}
        title={t("admin.actions.suspend")}
        description={t("admin.confirm.suspendUser")}
        confirmLabel={t("admin.actions.suspend")}
        danger
      />
      <ConfirmDialog
        open={confirmAction === "unsuspend"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          setStatus("active");
          void unsuspendUserAction(user.id);
        }}
        title={t("admin.actions.unsuspend")}
        description={t("admin.confirm.unsuspendUser")}
        confirmLabel={t("admin.actions.unsuspend")}
      />
      <ConfirmDialog
        open={confirmAction === "grantTrial"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          setTrialUsed(false);
          void grantTrialAction(user.id);
        }}
        title={t("admin.actions.grantTrial")}
        description={t("admin.confirm.grantTrial")}
        confirmLabel={t("admin.actions.grantTrial")}
      />
      <ConfirmDialog
        open={confirmAction === "resetTrial"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          setTrialUsed(false);
          void resetTrialAction(user.id);
        }}
        title={t("admin.actions.resetTrial")}
        description={t("admin.confirm.resetTrial")}
        confirmLabel={t("admin.actions.resetTrial")}
      />
    </div>
  );
}
