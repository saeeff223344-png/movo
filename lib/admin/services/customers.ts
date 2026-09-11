import "server-only";
import type { UserAccount } from "@/lib/admin/types/users";
import type { TrialRecord } from "@/lib/admin/types/billing";
import { createClient } from "@/lib/supabase/server";

/**
 * Real Supabase-backed implementation (see docs/database-schema.md).
 *
 * Reads are done as a few separate queries + an in-memory merge rather than
 * one large join: at admin-panel scale (hundreds/low-thousands of users)
 * this is simpler to read and verify than a hand-written multi-table SQL
 * join, at the cost of a few extra round trips. A Postgres view or RPC is
 * the natural next optimization once real usage volume justifies it.
 */

export async function getUsers(): Promise<UserAccount[]> {
  const supabase = await createClient();

  const [{ data: profiles }, { data: trials }, { data: subs }, { data: projects }, { data: plans }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("trial_usage").select("user_id, used"),
      supabase.from("subscriptions").select("user_id, plan_id, expiry_date").eq("status", "active"),
      supabase.from("projects").select("owner_id"),
      supabase.from("subscription_plans").select("id, name_ar"),
    ]);

  const trialByUser = new Map((trials ?? []).map((t) => [t.user_id, t.used]));
  const planNameById = new Map((plans ?? []).map((p) => [p.id, p.name_ar]));
  const activeSubByUser = new Map(
    (subs ?? [])
      .filter((s) => !s.expiry_date || new Date(s.expiry_date) > new Date())
      .map((s) => [s.user_id, s]),
  );
  const projectCountByUser = new Map<string, number>();
  for (const p of projects ?? []) {
    projectCountByUser.set(p.owner_id, (projectCountByUser.get(p.owner_id) ?? 0) + 1);
  }

  return (profiles ?? []).map((profile) => {
    const activeSub = activeSubByUser.get(profile.id);
    const planName = activeSub ? (planNameById.get(activeSub.plan_id) ?? null) : null;

    return {
      id: profile.id,
      fullName: profile.full_name ?? "",
      email: profile.email ?? "",
      language: profile.preferred_language,
      joinedAt: profile.created_at,
      lastActiveAt: profile.last_active_at,
      emailVerified: true, // Supabase Auth owns this (auth.users.email_confirmed_at); surfaced via a future admin view if needed.
      status: profile.account_status,
      trialUsed: trialByUser.get(profile.id) ?? false,
      subscriptionActive: Boolean(activeSub),
      planName,
      videosUsed: 0, // TODO: aggregate from usage_events once volume justifies a dedicated view (see docs/dynamic-content.md)
      videosRemaining: null,
      projectsCount: projectCountByUser.get(profile.id) ?? 0,
    } satisfies UserAccount;
  });
}

export async function getUser(id: string): Promise<UserAccount | undefined> {
  const users = await getUsers();
  return users.find((u) => u.id === id);
}

export async function getUserNotes(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_notes")
    .select("id, note, created_at, author_id")
    .eq("entity_type", "user")
    .eq("entity_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((n) => ({
    id: n.id,
    author: n.author_id,
    createdAt: n.created_at,
    note: n.note,
  }));
}

// Suspend/unsuspend are mutations with an audit trail — see
// lib/admin/actions/user-actions.ts (requirePermission + audit_logs insert),
// not plain reads, so they live in the actions layer instead of here.

export async function getTrial(userId: string): Promise<TrialRecord | undefined> {
  const trials = await getTrials();
  return trials.find((t) => t.userId === userId);
}

export async function getTrials(): Promise<TrialRecord[]> {
  const supabase = await createClient();
  const [{ data: trials }, { data: profiles }] = await Promise.all([
    supabase.from("trial_usage").select("*"),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? ""]));

  return (trials ?? []).map((t) => ({
    id: t.user_id,
    userId: t.user_id,
    userName: nameById.get(t.user_id) ?? "",
    used: t.used,
    usedAt: t.used_at,
    projectId: t.project_id,
    videoId: t.video_id,
    resetCount: t.reset_count,
    lastResetBy: t.last_reset_by,
    lastResetReason: t.last_reset_reason,
  }));
}

/** Admin grant/reset go through the RPCs in supabase/migrations/007 — see
 * lib/admin/actions/trial-actions.ts. This service now only reads. */
