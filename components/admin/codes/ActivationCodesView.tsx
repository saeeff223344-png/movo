"use client";

import { useMemo, useState } from "react";
import { Copy, Plus, Slash } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { SearchBox } from "@/components/admin/ui/SearchBox";
import { FilterBar, FilterSelect } from "@/components/admin/ui/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { Modal } from "@/components/ui/Modal";
import { FieldLabel, NumberInput, SelectField } from "@/components/admin/ui/FormField";
import type { ActivationCode, ActivationCodeStatus } from "@/lib/admin/types/billing";
import type { SubscriptionPlan } from "@/lib/admin/types/billing";
import { generateActivationCodesAction, disableActivationCodeAction } from "@/lib/admin/actions/billing-actions";

type Filter = "all" | ActivationCodeStatus;

const STATUS_TONE: Record<ActivationCodeStatus, "success" | "neutral" | "warning" | "danger"> = {
  available: "success",
  used: "neutral",
  expired: "warning",
  disabled: "danger",
};

export function ActivationCodesView({
  codes: initialCodes,
  plans,
}: {
  codes: ActivationCode[];
  plans: SubscriptionPlan[];
}) {
  const { t } = useI18n();
  const [codes, setCodes] = useState(initialCodes);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [count, setCount] = useState(10);
  const [customCount, setCustomCount] = useState(10);
  const [useCustom, setUseCustom] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return codes.filter((c) => {
      const matchesQuery = query.trim().length === 0 || c.code.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "all" || c.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [codes, query, filter]);

  async function handleGenerate() {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    setGenerating(true);
    setError(null);
    const result = await generateActivationCodesAction({
      planId: plan.id,
      count: useCustom ? customCount : count,
    });
    setGenerating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCodes((prev) => [...result.codes, ...prev]);
    setGenerateOpen(false);
  }

  const columns: DataTableColumn<ActivationCode>[] = [
    {
      key: "code",
      header: t("admin.table.code"),
      render: (c) => (
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(c.code)}
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-primary hover:text-brand-400"
        >
          {c.code}
          <Copy className="size-3" />
        </button>
      ),
    },
    { key: "plan", header: t("admin.table.plan"), render: (c) => c.planName },
    {
      key: "status",
      header: t("admin.table.status"),
      render: (c) => <StatusBadge label={t(`admin.status.${c.status}`)} tone={STATUS_TONE[c.status]} />,
    },
    { key: "createdAt", header: t("admin.table.createdAt"), render: (c) => <DateDisplay value={c.createdAt} /> },
    { key: "expiresAt", header: t("admin.codes.expiresAt"), render: (c) => <DateDisplay value={c.expiresAt} /> },
    { key: "usedBy", header: t("admin.codes.usedBy"), render: (c) => c.usedBy ?? "—" },
    {
      key: "actions",
      header: t("admin.table.actions"),
      render: (c) =>
        c.status === "available" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: "disabled" } : x)));
              void disableActivationCodeAction(c.id);
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300"
          >
            <Slash className="size-3" />
            {t("admin.actions.disable")}
          </button>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title={t("admin.nav.codes")}
        description={t("admin.codes.subtitle")}
        actions={
          <Button size="sm" onClick={() => setGenerateOpen(true)}>
            <Plus className="size-4" />
            {t("admin.codes.generate")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder={t("admin.common.search")} className="w-full sm:w-72" />
        <FilterBar>
          <FilterSelect
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("admin.common.all") },
              { value: "available", label: t("admin.status.available") },
              { value: "used", label: t("admin.status.used") },
              { value: "expired", label: t("admin.status.expired") },
              { value: "disabled", label: t("admin.status.disabled") },
            ]}
          />
        </FilterBar>
      </div>

      <DataTable columns={columns} data={filtered} getRowId={(c) => c.id} />

      <Modal open={generateOpen} onClose={() => setGenerateOpen(false)} title={t("admin.codes.generate")}>
        <div className="space-y-4">
          <FieldLabel label={t("admin.table.plan")}>
            <SelectField
              value={planId}
              onChange={setPlanId}
              options={plans.map((p) => ({ value: p.id, label: p.nameAr }))}
            />
          </FieldLabel>

          <div>
            <p className="mb-2 text-xs font-semibold text-secondary">{t("admin.codes.count")}</p>
            <div className="flex flex-wrap gap-1.5">
              {[1, 10, 25, 50, 100, 500].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setCount(n);
                    setUseCustom(false);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    !useCustom && count === n ? "bg-brand-500 text-white" : "bg-surface-hover text-secondary"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  useCustom ? "bg-brand-500 text-white" : "bg-surface-hover text-secondary"
                }`}
              >
                {t("admin.codes.custom")}
              </button>
            </div>
            {useCustom && (
              <div className="mt-2">
                <NumberInput value={customCount} onChange={setCustomCount} min={1} max={1000} />
              </div>
            )}
          </div>

          {error && <p className="text-xs font-semibold text-red-400">{error}</p>}
          <Button className="w-full" onClick={handleGenerate} disabled={generating}>
            {generating ? t("common.loading") : t("admin.codes.generate")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
