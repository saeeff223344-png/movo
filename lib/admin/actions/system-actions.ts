"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import type { SystemSettings, FeatureFlagId, KillSwitches, LocalizationSettings, EmailTemplate } from "@/lib/admin/types/system";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateSystemSettingsAction(settings: SystemSettings): Promise<ActionResult> {
  await requirePermission("settings", "manage");
  const supabase = await createClient();
  const { error } = await supabase
    .from("system_settings")
    .update({
      business: settings.business,
      limits: settings.limits,
      ai_providers: settings.aiProviders,
      rendering: settings.rendering,
      storage: settings.storage,
      security: settings.security,
      maintenance: settings.maintenance,
      kill_switches: settings.killSwitches,
      support_contact: settings.supportContact,
      subscription_contact: settings.subscriptionContact,
      payment_contact: settings.paymentContact,
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  revalidatePath("/admin/feature-flags");
  return { ok: true };
}

export async function updateFeatureFlagAction(id: FeatureFlagId, enabled: boolean): Promise<ActionResult> {
  await requirePermission("feature_flags", "manage");
  const actor = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("feature_flags")
    .update({ enabled, updated_by: actor.id })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    admin_id: actor.id,
    action: "feature_flag.updated",
    entity: "feature_flags",
    entity_id: id,
    new_value: String(enabled),
  });

  revalidatePath("/admin/feature-flags");
  revalidatePath("/");
  return { ok: true };
}

export async function updateKillSwitchAction(key: keyof KillSwitches, value: boolean): Promise<ActionResult> {
  await requirePermission("settings", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const { data: current } = await supabase.from("system_settings").select("kill_switches").eq("id", 1).single();
  const killSwitches = { ...(current?.kill_switches as Record<string, boolean> ?? {}), [key]: value };

  const { error } = await supabase.from("system_settings").update({ kill_switches: killSwitches }).eq("id", 1);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    admin_id: actor.id,
    action: "kill_switch.toggled",
    entity: "system_settings",
    entity_id: key,
    new_value: String(value),
  });

  revalidatePath("/admin/feature-flags");
  revalidatePath("/");
  return { ok: true };
}

// ---- Localization (requires migration 008) ----
export async function updateLocalizationSettingsAction(patch: LocalizationSettings): Promise<ActionResult> {
  await requirePermission("localization", "manage");
  const actor = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("localization_settings")
    .update({
      arabic_enabled: patch.arabicEnabled,
      english_enabled: patch.englishEnabled,
      default_locale: patch.defaultLocale,
      currency_display: patch.currencyDisplay,
      date_format: patch.dateFormat,
      updated_by: actor.id,
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/localization");
  return { ok: true };
}

// ---- Email ----
export async function updateEmailSettingsAction(input: {
  senderName: string;
  replyTo: string;
  supportEmail: string;
}): Promise<ActionResult> {
  await requirePermission("settings", "manage");
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_settings")
    .update({ sender_name: input.senderName, reply_to: input.replyTo, support_email: input.supportEmail })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/email");
  return { ok: true };
}

export async function updateEmailTemplateAction(template: EmailTemplate): Promise<ActionResult> {
  await requirePermission("settings", "manage");
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_templates")
    .update({
      subject_ar: template.subjectAr,
      subject_en: template.subjectEn,
      body_ar: template.bodyAr,
      body_en: template.bodyEn,
    })
    .eq("id", template.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/email");
  return { ok: true };
}
