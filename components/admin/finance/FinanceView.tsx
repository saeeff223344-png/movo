"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { MetricCard } from "@/components/admin/ui/MetricCard";
import { ChartCard, MiniBarChart } from "@/components/admin/ui/ChartCard";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import { SettingsSection, SettingsRow } from "@/components/admin/ui/SettingsSection";
import { NumberInput } from "@/components/admin/ui/FormField";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import { updateCostConfigurationAction } from "@/lib/admin/actions/finance-actions";
import type { FinanceSummary, FinanceCostConfig } from "@/lib/admin/types/finance";

export function FinanceView({ summary, costConfig }: { summary: FinanceSummary; costConfig: FinanceCostConfig }) {
  const { t } = useI18n();
  const [config, setConfig] = useState(costConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateCostConfigurationAction(config);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.finance")} description={t("admin.finance.subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t("admin.finance.revenueToday")} value={<MoneyDisplay amount={summary.revenueToday} />} />
        <MetricCard label={t("admin.finance.revenueMonth")} value={<MoneyDisplay amount={summary.revenueMonth} />} />
        <MetricCard label={t("admin.finance.revenueYear")} value={<MoneyDisplay amount={summary.revenueYear} />} />
        <MetricCard label={t("admin.finance.costMonth")} value={<MoneyDisplay amount={summary.costMonth} />} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t("admin.finance.grossProfit")} value={<MoneyDisplay amount={summary.grossProfitMonth} />} />
        <MetricCard label={t("admin.finance.netProfit")} value={<MoneyDisplay amount={summary.netProfitMonth} />} deltaLabel={`${summary.marginPercent}%`} />
        <MetricCard label={t("admin.finance.arpu")} value={<MoneyDisplay amount={summary.arpu} />} />
        <MetricCard label={t("admin.finance.costPerVideo")} value={<MoneyDisplay amount={summary.costPerVideo} />} />
      </div>

      <div className="mt-6">
        <ChartCard title={t("admin.finance.profitTrend")}>
          <MiniBarChart data={summary.byMonth.map((m) => ({ label: m.month, value: m.profit }))} />
        </ChartCard>
      </div>

      <div className="mt-6 max-w-2xl">
        <SettingsSection
          title={t("admin.finance.costConfigTitle")}
          description={t("admin.finance.costConfigDesc")}
          actions={
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="size-4" />
              {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
            </Button>
          }
        >
          {error && <AuthError message={error} />}
          <SettingsRow label={t("admin.finance.exchangeRate")}>
            <NumberInput value={config.exchangeRateUsdToIqd} onChange={(v) => setConfig({ ...config, exchangeRateUsdToIqd: v })} suffix="IQD/$" />
          </SettingsRow>
          <SettingsRow label={t("admin.simulator.textCost")}>
            <NumberInput value={config.textAiCostPerRequestUsd} onChange={(v) => setConfig({ ...config, textAiCostPerRequestUsd: v })} suffix="$" />
          </SettingsRow>
          <SettingsRow label={t("admin.simulator.imageCost")}>
            <NumberInput value={config.imageAiCostPerImageUsd} onChange={(v) => setConfig({ ...config, imageAiCostPerImageUsd: v })} suffix="$" />
          </SettingsRow>
          <SettingsRow label={t("admin.finance.renderCostPerMinute")}>
            <NumberInput value={config.renderCostPerMinuteUsd} onChange={(v) => setConfig({ ...config, renderCostPerMinuteUsd: v })} suffix="$" />
          </SettingsRow>
          <SettingsRow label={t("admin.finance.storageCostPerGb")}>
            <NumberInput value={config.storageCostPerGbUsd} onChange={(v) => setConfig({ ...config, storageCostPerGbUsd: v })} suffix="$" />
          </SettingsRow>
        </SettingsSection>
      </div>
    </div>
  );
}
