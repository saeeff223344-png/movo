"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionPlan, ActivationCode } from "@/lib/admin/types/billing";

type ActionResult = { ok: true } | { ok: false; error: string };

// ---- Plans ----
export async function updatePlanAction(
  id: string,
  patch: Pick<
    SubscriptionPlan,
    "nameAr" | "nameEn" | "descriptionAr" | "descriptionEn" | "price" | "durationDays" | "active" | "featured" | "displayOrder" | "limits" | "features"
  >,
): Promise<ActionResult> {
  await requirePermission("plans", "manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("subscription_plans")
    .update({
      name_ar: patch.nameAr,
      name_en: patch.nameEn,
      description_ar: patch.descriptionAr,
      description_en: patch.descriptionEn,
      price_iqd: patch.price,
      duration_days: patch.durationDays,
      active: patch.active,
      featured: patch.featured,
      display_order: patch.displayOrder,
      limits: patch.limits,
      features: patch.features,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/plans");
  revalidatePath(`/admin/plans/${id}`);
  return { ok: true };
}

// ---- Subscriptions ----
export async function extendSubscriptionAction(id: string, days: number): Promise<ActionResult> {
  await requirePermission("subscriptions", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const { data: sub } = await supabase.from("subscriptions").select("expiry_date").eq("id", id).single();
  if (!sub) return { ok: false, error: "NOT_FOUND" };

  const base = sub.expiry_date ? new Date(sub.expiry_date) : new Date();
  base.setDate(base.getDate() + days);

  const { error } = await supabase.from("subscriptions").update({ expiry_date: base.toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    admin_id: actor.id,
    action: "subscription.extended",
    entity: "subscriptions",
    entity_id: id,
    new_value: base.toISOString(),
    metadata: { days },
  });

  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/subscriptions/${id}`);
  return { ok: true };
}

export async function cancelSubscriptionAction(id: string, reason: string): Promise<ActionResult> {
  await requirePermission("subscriptions", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: reason })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    admin_id: actor.id,
    action: "subscription.cancelled",
    entity: "subscriptions",
    entity_id: id,
    reason,
  });

  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/subscriptions/${id}`);
  return { ok: true };
}

export async function reactivateSubscriptionAction(id: string): Promise<ActionResult> {
  await requirePermission("subscriptions", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "active", cancelled_at: null, cancel_reason: null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    admin_id: actor.id,
    action: "subscription.reactivated",
    entity: "subscriptions",
    entity_id: id,
  });

  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/subscriptions/${id}`);
  return { ok: true };
}

// ---- Activation codes ----
function randomCodeSuffix(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function generateActivationCodesAction(input: {
  planId: string;
  count: number;
}): Promise<{ ok: true; codes: ActivationCode[] } | { ok: false; error: string }> {
  await requirePermission("codes", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, name_ar, duration_days, billing_period")
    .eq("id", input.planId)
    .maybeSingle();
  if (!plan) return { ok: false, error: "PLAN_NOT_FOUND" };

  const count = Math.min(Math.max(input.count, 1), 1000);
  const prefix = plan.billing_period === "yearly" ? "YEARLY" : "MONTHLY";
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 180);

  const rows = Array.from({ length: count }, () => ({
    code: `MOVO-${prefix}-${randomCodeSuffix()}`,
    plan_id: plan.id,
    duration_days: plan.duration_days,
    status: "available" as const,
    created_by: actor.id,
    expires_at: expiresAt.toISOString(),
  }));

  const { data: inserted, error } = await supabase.from("activation_codes").insert(rows).select("*");
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    admin_id: actor.id,
    action: "codes.generated",
    entity: "activation_codes",
    entity_id: null,
    metadata: { plan_id: plan.id, count },
  });

  revalidatePath("/admin/activation-codes");

  return {
    ok: true,
    codes: (inserted ?? []).map((c) => ({
      id: c.id,
      code: c.code,
      planId: c.plan_id,
      planName: plan.name_ar,
      durationDays: c.duration_days,
      status: c.status,
      createdAt: c.created_at,
      createdBy: actor.id,
      expiresAt: c.expires_at,
      usedBy: null,
      usedAt: null,
      notes: c.notes,
    })),
  };
}

export async function disableActivationCodeAction(id: string): Promise<ActionResult> {
  await requirePermission("codes", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("activation_codes").update({ status: "disabled" }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    admin_id: actor.id,
    action: "code.disabled",
    entity: "activation_codes",
    entity_id: id,
  });

  revalidatePath("/admin/activation-codes");
  return { ok: true };
}

// ---- Payments ----
export async function verifyPaymentAction(id: string): Promise<ActionResult> {
  await requirePermission("payments", "manage");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_payment_and_activate_subscription", { p_payment_id: id });
  if (error) return { ok: false, error: error.message };
  const result = data as { status: string };
  if (result.status !== "verified") return { ok: false, error: result.status };

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${id}`);
  revalidatePath("/admin/subscriptions");
  return { ok: true };
}

export async function rejectPaymentAction(id: string): Promise<ActionResult> {
  await requirePermission("payments", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("payments")
    .update({ status: "rejected", verified_by: actor.id, verified_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    admin_id: actor.id,
    action: "payment.rejected",
    entity: "payments",
    entity_id: id,
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${id}`);
  return { ok: true };
}
