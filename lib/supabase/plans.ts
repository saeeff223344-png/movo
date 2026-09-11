import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/types/account";

export type PublicPlan = {
  id: string;
  slug: PlanId;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  priceIqd: number;
  durationDays: number;
  billingPeriod: "monthly" | "yearly";
};

/**
 * Same table, same rows the admin /admin/plans screen reads and writes
 * (subscription_plans) — this is the single source of truth for pricing on
 * both sides. RLS already allows anyone (incl. anon) to read active plans
 * (see "subscription_plans: public can read active" in 003_subscriptions.sql),
 * so a plain, unprivileged client is enough here.
 *
 * Returns `null` only on a genuine query failure (DB unreachable, RLS/grant
 * misconfiguration, etc.) — never a fabricated price. The caller decides how
 * to render that state; it must never be confused with "no active plans".
 */
export async function getPublicPlans(): Promise<PublicPlan[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, slug, name_ar, name_en, description_ar, description_en, price_iqd, duration_days, billing_period")
    .eq("active", true)
    .order("display_order");

  if (error) return null;

  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug as PlanId,
    nameAr: p.name_ar,
    nameEn: p.name_en,
    descriptionAr: p.description_ar,
    descriptionEn: p.description_en,
    priceIqd: p.price_iqd,
    durationDays: p.duration_days,
    billingPeriod: p.billing_period as PublicPlan["billingPeriod"],
  }));
}
