import "server-only";
import type {
  SubscriptionPlan,
  AdminSubscription,
  ActivationCode,
  PaymentRecord,
  PlanLimits,
} from "@/lib/admin/types/billing";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

// Seed data (007) only populated a few limits keys — the rest are
// legitimately "not yet decided" (see the column comment in
// 003_subscriptions.sql). Merging over these defaults means every plan the
// UI renders always has the full shape PlanDetailView iterates over, no
// matter which keys a given plan's jsonb actually has set.
const DEFAULT_PLAN_LIMITS: PlanLimits = {
  videos: 0,
  aiText: 0,
  aiImages: 0,
  aiVideoSeconds: 0,
  voiceSeconds: 0,
  revisions: 0,
  renderMinutes: 0,
  storageMb: 0,
  uploadMb: 0,
  assetsPerProject: 0,
  projects: 0,
  maxResolution: "1080p",
};

function mapPlan(row: {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  price_iqd: number;
  billing_period: string;
  duration_days: number;
  active: boolean;
  featured: boolean;
  display_order: number;
  limits: Json;
  features: Json;
}): SubscriptionPlan {
  return {
    id: row.id,
    slug: row.slug,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    descriptionAr: row.description_ar,
    descriptionEn: row.description_en,
    price: row.price_iqd,
    currency: "IQD",
    billingPeriod: row.billing_period as SubscriptionPlan["billingPeriod"],
    durationDays: row.duration_days,
    active: row.active,
    featured: row.featured,
    displayOrder: row.display_order,
    limits: { ...DEFAULT_PLAN_LIMITS, ...((row.limits as Record<string, unknown> | null) ?? {}) },
    features: {
      export1080p: false,
      export2k: false,
      export4k: false,
      voice: false,
      aiImages: false,
      aiVideo: false,
      watermark: false,
      priorityRendering: false,
      ...((row.features as Record<string, unknown> | null) ?? {}),
    },
  };
}

// ---- Plans ----
export async function getPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("subscription_plans").select("*").order("display_order");
  return (data ?? []).map(mapPlan);
}

export async function getPlan(id: string): Promise<SubscriptionPlan | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("subscription_plans").select("*").eq("id", id).maybeSingle();
  return data ? mapPlan(data) : undefined;
}

// ---- Subscriptions ----
async function mapSubscriptions(userId?: string): Promise<AdminSubscription[]> {
  const supabase = await createClient();

  let query = supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const { data: subs } = await query;

  const [{ data: profiles }, { data: plans }, { data: codes }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email"),
    supabase.from("subscription_plans").select("id, name_ar"),
    supabase.from("activation_codes").select("id, code"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const planNameById = new Map((plans ?? []).map((p) => [p.id, p.name_ar]));
  const codeById = new Map((codes ?? []).map((c) => [c.id, c.code]));

  return (subs ?? []).map((s) => {
    const profile = profileById.get(s.user_id);
    const activatedByProfile = s.activated_by ? profileById.get(s.activated_by) : null;
    return {
      id: s.id,
      userId: s.user_id,
      userName: profile?.full_name ?? "",
      userEmail: profile?.email ?? "",
      planId: s.plan_id,
      planName: planNameById.get(s.plan_id) ?? "",
      price: s.price_iqd,
      currency: "IQD",
      status: s.status as AdminSubscription["status"],
      startDate: s.start_date ?? s.created_at,
      expiryDate: s.expiry_date ?? s.created_at,
      activationSource: (s.activation_source ?? "manual") as AdminSubscription["activationSource"],
      activationCode: s.activation_code_id ? (codeById.get(s.activation_code_id) ?? null) : null,
      activatedBy: activatedByProfile?.full_name ?? s.activated_by ?? "",
      paymentId: s.payment_id,
      createdAt: s.created_at,
      cancelledAt: s.cancelled_at,
      cancelReason: s.cancel_reason,
      notes: s.notes,
    } satisfies AdminSubscription;
  });
}

export async function getSubscriptions(): Promise<AdminSubscription[]> {
  return mapSubscriptions();
}

export async function getSubscription(id: string): Promise<AdminSubscription | undefined> {
  const all = await mapSubscriptions();
  return all.find((s) => s.id === id);
}

export async function getSubscriptionsByUser(userId: string): Promise<AdminSubscription[]> {
  return mapSubscriptions(userId);
}

// ---- Activation codes ----
export async function getActivationCodes(): Promise<ActivationCode[]> {
  const supabase = await createClient();
  const [{ data: codes }, { data: plans }, { data: profiles }] = await Promise.all([
    supabase.from("activation_codes").select("*").order("created_at", { ascending: false }),
    supabase.from("subscription_plans").select("id, name_ar"),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const planNameById = new Map((plans ?? []).map((p) => [p.id, p.name_ar]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? ""]));

  return (codes ?? []).map((c) => ({
    id: c.id,
    code: c.code,
    planId: c.plan_id,
    planName: planNameById.get(c.plan_id) ?? "",
    durationDays: c.duration_days,
    status: c.status as ActivationCode["status"],
    createdAt: c.created_at,
    createdBy: c.created_by ? (nameById.get(c.created_by) ?? c.created_by) : "",
    expiresAt: c.expires_at,
    usedBy: c.used_by ? (nameById.get(c.used_by) ?? c.used_by) : null,
    usedAt: c.used_at,
    notes: c.notes,
  }));
}

// ---- Payments ----
async function mapPayments(userId?: string): Promise<PaymentRecord[]> {
  const supabase = await createClient();
  let query = supabase.from("payments").select("*").order("paid_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const { data: payments } = await query;

  const [{ data: profiles }, { data: subs }, { data: plans }] = await Promise.all([
    supabase.from("profiles").select("id, full_name"),
    supabase.from("subscriptions").select("id, plan_id"),
    supabase.from("subscription_plans").select("id, name_ar"),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? ""]));
  const planIdBySub = new Map((subs ?? []).map((s) => [s.id, s.plan_id]));
  const planNameById = new Map((plans ?? []).map((p) => [p.id, p.name_ar]));

  return (payments ?? []).map((p) => {
    const planId = p.subscription_id ? planIdBySub.get(p.subscription_id) : null;
    return {
      id: p.id,
      userId: p.user_id,
      userName: nameById.get(p.user_id) ?? "",
      subscriptionId: p.subscription_id,
      planName: planId ? (planNameById.get(planId) ?? "") : "",
      amount: p.amount_iqd,
      currency: "IQD",
      method: p.method as PaymentRecord["method"],
      reference: p.reference,
      status: p.status as PaymentRecord["status"],
      date: p.paid_at,
      verifiedBy: p.verified_by ? (nameById.get(p.verified_by) ?? p.verified_by) : null,
      verifiedAt: p.verified_at,
      notes: p.notes,
    } satisfies PaymentRecord;
  });
}

export async function getPayments(): Promise<PaymentRecord[]> {
  return mapPayments();
}

export async function getPayment(id: string): Promise<PaymentRecord | undefined> {
  const all = await mapPayments();
  return all.find((p) => p.id === id);
}

export async function getPaymentsByUser(userId: string): Promise<PaymentRecord[]> {
  return mapPayments(userId);
}
