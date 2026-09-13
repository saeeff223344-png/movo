import "server-only";
import { createClient } from "./server";

/**
 * The one authoritative server-side entitlement check (Locked business
 * rule: every account gets exactly one free trial video; after that, an
 * active subscription is required). Reused by:
 *   - lib/actions/video-plan-actions.ts — a read-only pre-check, purely to
 *     avoid spending OpenAI credits on a request that can't succeed anyway.
 *   - lib/actions/project-persistence.ts's saveGeneratedProject — the real
 *     enforcement + trial-consumption point (Requirement 1: consumed when
 *     the first valid project is successfully created/saved, not merely
 *     when /create is opened).
 *
 * `canGenerate` is never re-derived here — it comes straight from the
 * `can_generate()` SQL function (supabase/migrations/007_functions_indexes_seed.sql,
 * SECURITY DEFINER, already the DB's own single source of truth: active
 * subscription with expiry_date > now(), OR trial_usage.used = false) — so
 * this can never drift out of sync with what the database itself enforces.
 * The other fields are read alongside it purely to drive which UI message
 * to show (trial exhausted vs. subscription expired) — never used to make
 * the actual allow/deny decision themselves.
 */

export type EntitlementStatus = {
  trialAvailable: boolean;
  trialConsumed: boolean;
  activeSubscription: boolean;
  expiredSubscription: boolean;
  canGenerate: boolean;
};

export type ConsumeTrialResult = { ok: true; status: "consumed" | "already_used" } | { ok: false; error: string };

/**
 * Injected into lib/actions/project-persistence.ts's saveGeneratedProject so
 * that logic stays unit-testable without a real Supabase project — same
 * "repository interface + real Supabase adapter" split as ProjectsClient,
 * VideosClient, RenderJobsClient elsewhere in this codebase. `userId` is
 * always the server-verified id from requireUser()/getSession() — never
 * client input.
 */
export type EntitlementClient = {
  getStatus(userId: string): Promise<EntitlementStatus>;
  consumeTrial(userId: string, projectId: string): Promise<ConsumeTrialResult>;
};

export async function getEntitlementStatusForUser(userId: string): Promise<EntitlementStatus> {
  const supabase = await createClient();

  const [{ data: canGenerateRpc }, { data: trial }, { data: subscription }] = await Promise.all([
    supabase.rpc("can_generate"),
    supabase.from("trial_usage").select("used").eq("user_id", userId).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status, expiry_date")
      .eq("user_id", userId)
      .order("expiry_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const trialConsumed = trial?.used ?? false;
  const activeSubscription = Boolean(
    subscription && subscription.status === "active" && (!subscription.expiry_date || new Date(subscription.expiry_date) > new Date()),
  );
  const expiredSubscription = Boolean(subscription) && !activeSubscription;

  return {
    trialAvailable: !trialConsumed,
    trialConsumed,
    activeSubscription,
    expiredSubscription,
    canGenerate: canGenerateRpc ?? false,
  };
}

/**
 * Calls the consume_trial(p_project_id) RPC — row-locked and idempotent by
 * design (007_functions_indexes_seed.sql): a second call for a user whose
 * trial is already used returns "already_used" rather than erroring, so a
 * caller never needs to pre-check before calling this. Only ever called
 * once, right after a brand-new project is successfully saved, and only
 * when the generation wasn't already covered by an active subscription
 * (Requirement 6: subscribed users never spend their trial).
 */
export async function consumeTrialForUser(userId: string, projectId: string): Promise<ConsumeTrialResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_trial", { p_project_id: projectId });
  if (error) return { ok: false, error: error.message };

  const result = data as { status?: string } | null;
  if (result?.status === "consumed" || result?.status === "already_used") {
    return { ok: true, status: result.status };
  }
  return { ok: false, error: "Unexpected consume_trial response." };
}

export function realEntitlementClient(): EntitlementClient {
  return { getStatus: getEntitlementStatusForUser, consumeTrial: consumeTrialForUser };
}
