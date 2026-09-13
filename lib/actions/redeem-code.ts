"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/types/account";

export type RedeemCodeResult =
  | { status: "valid"; plan: PlanId; expiryDate: string }
  | { status: "invalid" }
  | { status: "used" }
  | { status: "expired" }
  | { status: "error"; message: string };

/**
 * Calls the redeem_activation_code RPC (supabase/migrations/007) — the
 * atomic, row-locked, single-use guarantee lives entirely in that function.
 * This action just translates auth + the jsonb result into the shape the
 * existing ActivationForm UI already expects.
 */
export async function redeemActivationCode(rawCode: string): Promise<RedeemCodeResult> {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("redeem_activation_code", { p_code: rawCode.trim() });

  if (error) {
    return { status: "error", message: error.message };
  }

  const result = data as { status: string; plan_id?: string; expiry_date?: string };

  if (result.status !== "valid") {
    return { status: result.status as "invalid" | "used" | "expired" };
  }

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("slug")
    .eq("id", result.plan_id!)
    .single();

  revalidatePath("/subscription");
  revalidatePath("/dashboard");
  // So a stale "trial blocked" /create render (its subscription/trial props
  // are fetched once per server render) picks up the newly-active
  // subscription on the next visit, without requiring a manual hard reload.
  revalidatePath("/create");

  return {
    status: "valid",
    plan: (plan?.slug as PlanId) ?? "monthly",
    expiryDate: result.expiry_date!,
  };
}
