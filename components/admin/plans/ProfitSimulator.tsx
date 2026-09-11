"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { NumberInput, FieldLabel } from "@/components/admin/ui/FormField";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import { DetailField, DetailGrid } from "@/components/admin/ui/DetailGrid";
import type { SubscriptionPlan } from "@/lib/admin/types/billing";
import type { FinanceCostConfig } from "@/lib/admin/types/finance";

export function ProfitSimulator({
  plan,
  costConfig,
}: {
  plan: SubscriptionPlan;
  costConfig: FinanceCostConfig;
}) {
  const { t } = useI18n();

  const [priceIqd, setPriceIqd] = useState(plan.price);
  const [videosIncluded, setVideosIncluded] = useState(plan.limits.videos);
  const [textCostUsd, setTextCostUsd] = useState(costConfig.textAiCostPerRequestUsd * 6);
  const [imageCostUsd, setImageCostUsd] = useState(costConfig.imageAiCostPerImageUsd * 2);
  const [videoAiCostUsd, setVideoAiCostUsd] = useState(0);
  const [voiceCostUsd, setVoiceCostUsd] = useState(0);
  const [renderCostUsd, setRenderCostUsd] = useState(costConfig.renderCostPerMinuteUsd * 1.5);
  const [storageCostUsd, setStorageCostUsd] = useState(costConfig.storageCostPerGbUsd * 0.05);
  const [bandwidthCostUsd, setBandwidthCostUsd] = useState(costConfig.bandwidthCostPerGbUsd * 0.05);
  const [otherCostUsd, setOtherCostUsd] = useState(costConfig.otherCostPerVideoUsd);
  const [exchangeRate, setExchangeRate] = useState(costConfig.exchangeRateUsdToIqd);
  const [avgUsagePercent, setAvgUsagePercent] = useState(70);

  const result = useMemo(() => {
    const costPerVideoUsd =
      textCostUsd + imageCostUsd + videoAiCostUsd + voiceCostUsd + renderCostUsd + storageCostUsd + bandwidthCostUsd + otherCostUsd;
    const costPerVideoIqd = costPerVideoUsd * exchangeRate;

    const totalEstimatedCost = costPerVideoIqd * videosIncluded * (avgUsagePercent / 100);
    const maxPossibleCost = costPerVideoIqd * videosIncluded;
    const costPerSubscriber = totalEstimatedCost;
    const revenuePerVideo = videosIncluded > 0 ? priceIqd / videosIncluded : 0;

    const grossProfit = priceIqd - totalEstimatedCost;
    const netProfit = priceIqd - maxPossibleCost;
    const profitPercent = priceIqd > 0 ? (netProfit / priceIqd) * 100 : 0;

    const breakEvenUsage = costPerVideoIqd > 0 ? Math.floor(priceIqd / costPerVideoIqd) : 0;
    const safeAllowance = Math.floor(breakEvenUsage * 0.8);

    const status: "profitable" | "low" | "danger" =
      profitPercent >= 50 ? "profitable" : profitPercent >= 20 ? "low" : "danger";

    return {
      costPerVideoUsd,
      costPerVideoIqd,
      totalEstimatedCost,
      maxPossibleCost,
      costPerSubscriber,
      revenuePerVideo,
      grossProfit,
      netProfit,
      profitPercent,
      breakEvenUsage,
      safeAllowance,
      status,
    };
  }, [
    textCostUsd,
    imageCostUsd,
    videoAiCostUsd,
    voiceCostUsd,
    renderCostUsd,
    storageCostUsd,
    bandwidthCostUsd,
    otherCostUsd,
    exchangeRate,
    videosIncluded,
    avgUsagePercent,
    priceIqd,
  ]);

  const statusConfig = {
    profitable: { icon: CheckCircle2, tone: "border-emerald-500/30 bg-emerald-500/5 text-emerald-500", label: t("admin.simulator.statusProfitable") },
    low: { icon: TrendingDown, tone: "border-amber-500/30 bg-amber-500/5 text-amber-500", label: t("admin.simulator.statusLow") },
    danger: { icon: AlertTriangle, tone: "border-red-500/30 bg-red-500/5 text-red-400", label: t("admin.simulator.statusDanger") },
  }[result.status];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-5">
        <h3 className="text-sm font-bold text-primary">{t("admin.simulator.inputsTitle")}</h3>

        <FieldLabel label={t("admin.simulator.planPrice")}>
          <NumberInput value={priceIqd} onChange={setPriceIqd} suffix="IQD" />
        </FieldLabel>
        <FieldLabel label={t("admin.simulator.videosIncluded")}>
          <NumberInput value={videosIncluded} onChange={setVideosIncluded} min={1} />
        </FieldLabel>
        <FieldLabel label={t("admin.simulator.avgUsage")}>
          <NumberInput value={avgUsagePercent} onChange={setAvgUsagePercent} min={0} max={100} suffix="%" />
        </FieldLabel>
        <FieldLabel label={t("admin.simulator.exchangeRate")}>
          <NumberInput value={exchangeRate} onChange={setExchangeRate} suffix="IQD/$" />
        </FieldLabel>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <FieldLabel label={t("admin.simulator.textCost")}>
            <NumberInput value={textCostUsd} onChange={setTextCostUsd} suffix="$" />
          </FieldLabel>
          <FieldLabel label={t("admin.simulator.imageCost")}>
            <NumberInput value={imageCostUsd} onChange={setImageCostUsd} suffix="$" />
          </FieldLabel>
          <FieldLabel label={t("admin.simulator.videoAiCost")}>
            <NumberInput value={videoAiCostUsd} onChange={setVideoAiCostUsd} suffix="$" />
          </FieldLabel>
          <FieldLabel label={t("admin.simulator.voiceCost")}>
            <NumberInput value={voiceCostUsd} onChange={setVoiceCostUsd} suffix="$" />
          </FieldLabel>
          <FieldLabel label={t("admin.simulator.renderCost")}>
            <NumberInput value={renderCostUsd} onChange={setRenderCostUsd} suffix="$" />
          </FieldLabel>
          <FieldLabel label={t("admin.simulator.storageCost")}>
            <NumberInput value={storageCostUsd} onChange={setStorageCostUsd} suffix="$" />
          </FieldLabel>
          <FieldLabel label={t("admin.simulator.bandwidthCost")}>
            <NumberInput value={bandwidthCostUsd} onChange={setBandwidthCostUsd} suffix="$" />
          </FieldLabel>
          <FieldLabel label={t("admin.simulator.otherCost")}>
            <NumberInput value={otherCostUsd} onChange={setOtherCostUsd} suffix="$" />
          </FieldLabel>
        </div>
      </div>

      <div className="space-y-4">
        <div className={`flex items-center gap-3 rounded-2xl border p-4 ${statusConfig.tone}`}>
          <statusConfig.icon className="size-5 shrink-0" />
          <div>
            <p className="text-sm font-bold">{statusConfig.label}</p>
            <p className="text-xs opacity-80">
              {t("admin.simulator.profitPercent")}: {result.profitPercent.toFixed(1)}%
            </p>
          </div>
        </div>

        <DetailGrid>
          <DetailField label={t("admin.simulator.costPerVideo")} value={<MoneyDisplay amount={Math.round(result.costPerVideoIqd)} />} />
          <DetailField label={t("admin.simulator.revenuePerVideo")} value={<MoneyDisplay amount={Math.round(result.revenuePerVideo)} />} />
          <DetailField label={t("admin.simulator.costPerSubscriber")} value={<MoneyDisplay amount={Math.round(result.costPerSubscriber)} />} />
          <DetailField label={t("admin.simulator.totalEstimatedCost")} value={<MoneyDisplay amount={Math.round(result.totalEstimatedCost)} />} />
          <DetailField label={t("admin.simulator.maxPossibleCost")} value={<MoneyDisplay amount={Math.round(result.maxPossibleCost)} />} />
          <DetailField label={t("admin.simulator.grossProfit")} value={<MoneyDisplay amount={Math.round(result.grossProfit)} />} />
          <DetailField label={t("admin.simulator.netProfit")} value={<MoneyDisplay amount={Math.round(result.netProfit)} />} />
          <DetailField label={t("admin.simulator.breakEven")} value={`${result.breakEvenUsage} ${t("admin.simulator.videosUnit")}`} />
          <DetailField label={t("admin.simulator.safeAllowance")} value={`${result.safeAllowance} ${t("admin.simulator.videosUnit")}`} />
        </DetailGrid>
      </div>
    </div>
  );
}
