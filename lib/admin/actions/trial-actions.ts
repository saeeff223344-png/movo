"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Thin wrappers around the grant_trial/reset_trial RPCs
 * (supabase/migrations/007_functions_indexes_seed.sql). The RPCs themselves
 * enforce trials.manage server-side via has_permission(); this action layer
 * just gives the client components a typed, revalidating entry point.
 */

export async function grantTrialAction(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("grant_trial", { p_user_id: userId });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/trials");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true as const, data };
}

export async function resetTrialAction(userId: string, reason?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reset_trial", { p_user_id: userId, p_reason: reason });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/trials");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true as const, data };
}
