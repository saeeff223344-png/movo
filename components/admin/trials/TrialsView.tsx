"use client";

import { useMemo, useState } from "react";
import { Gift, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SearchBox } from "@/components/admin/ui/SearchBox";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import type { TrialRecord } from "@/lib/admin/types/billing";

export function TrialsView({ trials: initialTrials }: { trials: TrialRecord[] }) {
  const { t } = useI18n();
  const [trials, setTrials] = useState(initialTrials);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<TrialRecord | null>(null);

  const filtered = useMemo(
    () => trials.filter((tr) => query.trim().length === 0 || tr.userName.toLowerCase().includes(query.toLowerCase())),
    [trials, query],
  );

  const columns: DataTableColumn<TrialRecord>[] = [
    { key: "user", header: t("admin.table.user"), render: (tr) => tr.userName },
    {
      key: "status",
      header: t("admin.table.status"),
      render: (tr) => (
        <StatusBadge label={tr.used ? t("admin.status.used") : t("admin.status.available")} tone={tr.used ? "neutral" : "info"} />
      ),
    },
    { key: "usedAt", header: t("admin.trials.usedAt"), render: (tr) => <DateDisplay value={tr.usedAt} /> },
    { key: "resetCount", header: t("admin.trials.resetCount"), render: (tr) => tr.resetCount },
    { key: "lastResetBy", header: t("admin.trials.lastResetBy"), render: (tr) => tr.lastResetBy ?? "—" },
    {
      key: "actions",
      header: t("admin.table.actions"),
      render: (tr) =>
        tr.used ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTarget(tr);
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300"
          >
            <RotateCcw className="size-3" />
            {t("admin.actions.resetTrial")}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Gift className="size-3" />
            {t("admin.status.available")}
          </span>
        ),
    },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.trials")} description={t("admin.trials.subtitle")} />
      <div className="mb-4">
        <SearchBox value={query} onChange={setQuery} placeholder={t("admin.common.search")} className="w-full sm:w-72" />
      </div>
      <DataTable columns={columns} data={filtered} getRowId={(tr) => tr.id} />

      <ConfirmDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        onConfirm={() => {
          if (!target) return;
          setTrials((prev) =>
            prev.map((tr) =>
              tr.id === target.id ? { ...tr, used: false, usedAt: null, resetCount: tr.resetCount + 1, lastResetBy: "المدير العام" } : tr,
            ),
          );
        }}
        title={t("admin.actions.resetTrial")}
        description={t("admin.confirm.resetTrial")}
        confirmLabel={t("admin.actions.resetTrial")}
      />
    </div>
  );
}
