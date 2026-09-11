import "server-only";
import type { FinanceCostConfig, FinanceSummary } from "@/lib/admin/types/finance";
import { createClient } from "@/lib/supabase/server";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Revenue/cost aggregated live from payments/ai_jobs/render_jobs — see
 * docs/database-schema.md "usage_events append-only ledger" note. These
 * tables are empty until real payments/AI generation happen, so a fresh
 * project correctly shows all-zero, not a fabricated demo number.
 */
export async function getFinanceSummary(): Promise<FinanceSummary> {
  const supabase = await createClient();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    { data: payments },
    { data: aiJobs },
    { data: renderJobs },
    { count: activeSubsCount },
    { count: totalUsersCount },
    { count: videosThisMonthCount },
  ] = await Promise.all([
    supabase.from("payments").select("amount_iqd, paid_at, status").eq("status", "verified").gte("paid_at", sixMonthsAgo.toISOString()),
    supabase.from("ai_jobs").select("cost_iqd, created_at").gte("created_at", sixMonthsAgo.toISOString()),
    supabase.from("render_jobs").select("estimated_cost_iqd, created_at").gte("created_at", sixMonthsAgo.toISOString()),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("videos").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
  ]);

  const byMonthMap = new Map<string, { revenue: number; cost: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    byMonthMap.set(monthKey(d), { revenue: 0, cost: 0 });
  }

  let revenueToday = 0;
  let revenueMonth = 0;
  let revenueYear = 0;
  for (const p of payments ?? []) {
    const paidAt = new Date(p.paid_at);
    const key = monthKey(paidAt);
    if (byMonthMap.has(key)) byMonthMap.get(key)!.revenue += p.amount_iqd;
    if (paidAt >= startOfToday) revenueToday += p.amount_iqd;
    if (paidAt >= startOfMonth) revenueMonth += p.amount_iqd;
    if (paidAt >= startOfYear) revenueYear += p.amount_iqd;
  }

  let costMonth = 0;
  for (const j of aiJobs ?? []) {
    const key = monthKey(new Date(j.created_at));
    if (byMonthMap.has(key)) byMonthMap.get(key)!.cost += j.cost_iqd ?? 0;
    if (new Date(j.created_at) >= startOfMonth) costMonth += j.cost_iqd ?? 0;
  }
  for (const r of renderJobs ?? []) {
    const key = monthKey(new Date(r.created_at));
    if (byMonthMap.has(key)) byMonthMap.get(key)!.cost += r.estimated_cost_iqd ?? 0;
    if (new Date(r.created_at) >= startOfMonth) costMonth += r.estimated_cost_iqd ?? 0;
  }

  const activeSubscribers = activeSubsCount ?? 0;
  const totalUsers = totalUsersCount ?? 0;
  const videosThisMonth = videosThisMonthCount ?? 0;
  const grossProfitMonth = revenueMonth - costMonth;
  const netProfitMonth = grossProfitMonth;
  const marginPercent = revenueMonth > 0 ? Math.round((netProfitMonth / revenueMonth) * 100) : 0;

  return {
    revenueToday,
    revenueMonth,
    revenueYear,
    costMonth,
    grossProfitMonth,
    netProfitMonth,
    marginPercent,
    arpu: activeSubscribers > 0 ? Math.round(revenueMonth / activeSubscribers) : 0,
    costPerUser: totalUsers > 0 ? Math.round(costMonth / totalUsers) : 0,
    costPerVideo: videosThisMonth > 0 ? Math.round(costMonth / videosThisMonth) : 0,
    byMonth: Array.from(byMonthMap.entries()).map(([month, v]) => ({
      month,
      revenue: v.revenue,
      cost: v.cost,
      profit: v.revenue - v.cost,
    })),
  };
}

function mapCostConfig(row: {
  exchange_rate_usd_to_iqd: number;
  text_ai_cost_per_request_usd: number;
  image_ai_cost_per_image_usd: number;
  video_ai_cost_per_second_usd: number;
  voice_cost_per_second_usd: number;
  render_cost_per_minute_usd: number;
  storage_cost_per_gb_usd: number;
  bandwidth_cost_per_gb_usd: number;
  other_cost_per_video_usd: number;
}): FinanceCostConfig {
  return {
    exchangeRateUsdToIqd: Number(row.exchange_rate_usd_to_iqd),
    textAiCostPerRequestUsd: Number(row.text_ai_cost_per_request_usd),
    imageAiCostPerImageUsd: Number(row.image_ai_cost_per_image_usd),
    videoAiCostPerSecondUsd: Number(row.video_ai_cost_per_second_usd),
    voiceCostPerSecondUsd: Number(row.voice_cost_per_second_usd),
    renderCostPerMinuteUsd: Number(row.render_cost_per_minute_usd),
    storageCostPerGbUsd: Number(row.storage_cost_per_gb_usd),
    bandwidthCostPerGbUsd: Number(row.bandwidth_cost_per_gb_usd),
    otherCostPerVideoUsd: Number(row.other_cost_per_video_usd),
  };
}

const DEFAULT_COST_CONFIG: FinanceCostConfig = {
  exchangeRateUsdToIqd: 1310,
  textAiCostPerRequestUsd: 0,
  imageAiCostPerImageUsd: 0,
  videoAiCostPerSecondUsd: 0,
  voiceCostPerSecondUsd: 0,
  renderCostPerMinuteUsd: 0,
  storageCostPerGbUsd: 0,
  bandwidthCostPerGbUsd: 0,
  otherCostPerVideoUsd: 0,
};

// Requires migration 008 (supabase/migrations/008_settings_gaps.sql) to be
// applied — see docs/supabase-setup.md. Falls back to sane defaults if the
// table doesn't exist yet so the page still renders instead of throwing.
export async function getCostConfiguration(): Promise<FinanceCostConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("finance_cost_config").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return DEFAULT_COST_CONFIG;
  return mapCostConfig(data);
}
