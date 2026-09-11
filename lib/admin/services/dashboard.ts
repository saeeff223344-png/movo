import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getFinanceSummary } from "@/lib/admin/services/finance";

/** Real aggregation of every KPI the /admin dashboard shows — counts are
 * done with head:true/count:'exact' requests (no row payload) wherever
 * possible to keep this cheap even as tables grow. */
export async function getAdminDashboard() {
  const supabase = await createClient();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: newToday },
    { count: newThisWeek },
    { count: newThisMonth },
    { count: activeUsers },
    { count: totalSubs },
    { count: activeSubsCount },
    { count: expiredSubs },
    { count: cancelledSubs },
    { data: activeSubsExpiry },
    { count: trialsUsed },
    { count: trialsTotal },
    { count: totalProjects },
    { count: totalVideos },
    { count: generatedToday },
    { count: generatedMonth },
    { count: failedProjects },
    { count: aiTotal },
    { count: aiSucceeded },
    { count: aiFailed },
    { data: aiCosts },
    { count: renderQueued },
    { count: renderProcessing },
    { count: renderSucceeded },
    { count: renderFailed },
    { count: openTickets },
    { count: urgentTickets },
    { count: waitingTickets },
    financeSummary,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { head: true, count: "exact" }),
    supabase.from("profiles").select("id", { head: true, count: "exact" }).gte("created_at", dayAgo),
    supabase.from("profiles").select("id", { head: true, count: "exact" }).gte("created_at", weekAgo),
    supabase.from("profiles").select("id", { head: true, count: "exact" }).gte("created_at", monthAgo),
    supabase.from("profiles").select("id", { head: true, count: "exact" }).eq("account_status", "active"),
    supabase.from("subscriptions").select("id", { head: true, count: "exact" }),
    supabase.from("subscriptions").select("id", { head: true, count: "exact" }).eq("status", "active"),
    supabase.from("subscriptions").select("id", { head: true, count: "exact" }).eq("status", "expired"),
    supabase.from("subscriptions").select("id", { head: true, count: "exact" }).eq("status", "cancelled"),
    supabase.from("subscriptions").select("expiry_date, plan_id").eq("status", "active"),
    supabase.from("trial_usage").select("user_id", { head: true, count: "exact" }).eq("used", true),
    supabase.from("trial_usage").select("user_id", { head: true, count: "exact" }),
    supabase.from("projects").select("id", { head: true, count: "exact" }),
    supabase.from("videos").select("id", { head: true, count: "exact" }),
    supabase.from("projects").select("id", { head: true, count: "exact" }).gte("created_at", dayAgo),
    supabase.from("projects").select("id", { head: true, count: "exact" }).gte("created_at", monthAgo),
    supabase.from("projects").select("id", { head: true, count: "exact" }).eq("status", "failed"),
    supabase.from("ai_jobs").select("id", { head: true, count: "exact" }),
    supabase.from("ai_jobs").select("id", { head: true, count: "exact" }).eq("status", "succeeded"),
    supabase.from("ai_jobs").select("id", { head: true, count: "exact" }).eq("status", "failed"),
    supabase.from("ai_jobs").select("cost_usd"),
    supabase.from("render_jobs").select("id", { head: true, count: "exact" }).eq("status", "queued"),
    supabase.from("render_jobs").select("id", { head: true, count: "exact" }).eq("status", "processing"),
    supabase.from("render_jobs").select("id", { head: true, count: "exact" }).eq("status", "succeeded"),
    supabase.from("render_jobs").select("id", { head: true, count: "exact" }).eq("status", "failed"),
    supabase.from("support_tickets").select("id", { head: true, count: "exact" }).eq("status", "open"),
    supabase.from("support_tickets").select("id", { head: true, count: "exact" }).eq("priority", "urgent").neq("status", "closed"),
    supabase.from("support_tickets").select("id", { head: true, count: "exact" }).eq("status", "waiting_user"),
    getFinanceSummary(),
  ]);

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const expiringSoon = (activeSubsExpiry ?? []).filter(
    (s) => s.expiry_date && new Date(s.expiry_date).getTime() - now.getTime() < weekMs,
  ).length;

  let monthlyCount = 0;
  let annualCount = 0;
  if ((activeSubsExpiry ?? []).length > 0) {
    const { data: plans } = await supabase.from("subscription_plans").select("id, billing_period");
    const periodByPlan = new Map((plans ?? []).map((p) => [p.id, p.billing_period]));
    for (const s of activeSubsExpiry ?? []) {
      if (periodByPlan.get(s.plan_id) === "monthly") monthlyCount += 1;
      else if (periodByPlan.get(s.plan_id) === "yearly") annualCount += 1;
    }
  }

  const aiCostUsd = (aiCosts ?? []).reduce((sum, j) => sum + (j.cost_usd ? Number(j.cost_usd) : 0), 0);
  const usedTrials = trialsUsed ?? 0;
  const availableTrials = (trialsTotal ?? 0) - usedTrials;

  return {
    users: {
      total: totalUsers ?? 0,
      newToday: newToday ?? 0,
      newThisWeek: newThisWeek ?? 0,
      newThisMonth: newThisMonth ?? 0,
      active: activeUsers ?? 0,
    },
    subscriptions: {
      totalSubscribers: totalSubs ?? 0,
      active: activeSubsCount ?? 0,
      monthly: monthlyCount,
      annual: annualCount,
      expired: expiredSubs ?? 0,
      expiringSoon,
      cancelled: cancelledSubs ?? 0,
    },
    trials: {
      available: availableTrials,
      used: usedTrials,
      conversionRate: usedTrials > 0 ? Math.round(((activeSubsCount ?? 0) / usedTrials) * 100) : 0,
    },
    videos: {
      projects: totalProjects ?? 0,
      videos: totalVideos ?? 0,
      generatedToday: generatedToday ?? 0,
      generatedMonth: generatedMonth ?? 0,
      failed: failedProjects ?? 0,
    },
    ai: {
      requests: aiTotal ?? 0,
      success: aiSucceeded ?? 0,
      failures: aiFailed ?? 0,
      estimatedCostUsd: Math.round(aiCostUsd * 100) / 100,
    },
    renders: {
      queued: renderQueued ?? 0,
      rendering: renderProcessing ?? 0,
      success: renderSucceeded ?? 0,
      failed: renderFailed ?? 0,
    },
    finance: financeSummary,
    support: {
      open: openTickets ?? 0,
      urgent: urgentTickets ?? 0,
      waiting: waitingTickets ?? 0,
    },
    generatedAt: now.toISOString(),
  };
}

export type AdminDashboardData = Awaited<ReturnType<typeof getAdminDashboard>>;
