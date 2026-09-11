import "server-only";
import type { PlanId, SubscriptionStatus, TrialStatus } from "@/lib/types/account";
import { getSession } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";

const INACTIVE: SubscriptionStatus = { active: false, plan: null, startDate: null, expiryDate: null };
const UNUSED_TRIAL: TrialStatus = { used: false, usedAt: null };

/**
 * The current user's real subscription status — reads the same
 * `subscriptions` table the redeem_activation_code RPC (007) writes to and
 * the admin panel's billing service reads from. Previously the /subscription
 * and /settings pages rendered `mockSubscription` (always inactive) instead
 * of ever querying this, which is why a successful activation never showed
 * up in the UI even though the database row was created correctly.
 */
export async function getCurrentSubscriptionStatus(): Promise<SubscriptionStatus> {
  const user = await getSession();
  if (!user) return INACTIVE;

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status, start_date, expiry_date")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("expiry_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) return INACTIVE;

  const { data: plan } = await supabase.from("subscription_plans").select("slug").eq("id", sub.plan_id).maybeSingle();

  return {
    active: true,
    plan: (plan?.slug as PlanId) ?? null,
    startDate: sub.start_date,
    expiryDate: sub.expiry_date,
  };
}

export async function getCurrentTrialStatus(): Promise<TrialStatus> {
  const user = await getSession();
  if (!user) return UNUSED_TRIAL;

  const supabase = await createClient();
  const { data } = await supabase.from("trial_usage").select("used, used_at").eq("user_id", user.id).maybeSingle();
  if (!data) return UNUSED_TRIAL;
  return { used: data.used, usedAt: data.used_at };
}
