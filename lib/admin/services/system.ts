import "server-only";
import type {
  SystemSettings,
  FeatureFlag,
  AuditLogEntry,
  SystemHealthServiceEntry,
  LocalizationSettings,
  EmailSettings,
} from "@/lib/admin/types/system";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_SETTINGS_JSON = {
  business: { displayName: "MOVO", legalName: "", country: "", currency: "IQD" as const, timezone: "", description: "" },
  aiProviders: [] as SystemSettings["aiProviders"],
  limits: {
    maxPromptLength: 600, maxUploadMb: 10, allowedUploadTypes: [], maxAssetsPerProject: 10, maxVideoDurationSeconds: 30,
    maxProjectsPerUser: 50, maxRevisionsPerProject: 20, maxGenerationsPerDay: 5, maxGenerationsPerMonth: 60,
    maxConcurrentJobs: 3, renderRetries: 2, storageLimitMb: 5120,
  },
  rendering: { defaultResolution: "1080p" as const, resolution2kEnabled: false, resolution4kEnabled: false, fps: 30, format: "mp4" as const, timeoutSeconds: 180, retryLimit: 2 },
  storage: { provider: "supabase-storage", uploadLimitMb: 10, allowedMimeTypes: [], videoRetentionDays: 365, assetRetentionDays: 180, storageQuotaGb: 500 },
  security: { requireStrongPasswords: true, adminSessionDurationMinutes: 480, forcePasswordChangeOnFirstLogin: true, twoFactorEnabled: false, maxLoginAttempts: 5, inactivityTimeoutMinutes: 30 },
  maintenance: { enabled: false, messageAr: "", messageEn: "", estimatedCompletion: null, allowAdminAccess: true },
  killSwitches: { registrationsPaused: false, generationPaused: false, renderingPaused: false, subscriptionActivationPaused: false, aiVideoPaused: false, uploadsPaused: false },
  supportContact: { phone: { enabled: false, value: "" }, whatsapp: { enabled: false, value: "" }, email: { enabled: false, value: "" }, telegram: { enabled: false, value: "" }, instagram: { enabled: false, value: "" }, facebook: { enabled: false, value: "" }, x: { enabled: false, value: "" }, workingHours: "", primaryChannel: "whatsapp" as const, countryCode: "+964" },
  subscriptionContact: { phone: { enabled: false, value: "" }, whatsapp: { enabled: false, value: "" }, email: { enabled: false, value: "" }, instructionsAr: "", instructionsEn: "" },
  paymentContact: { phone: { enabled: false, value: "" }, whatsapp: { enabled: false, value: "" }, instructionsAr: "", instructionsEn: "" },
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("system_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS_JSON as SystemSettings;

  return {
    business: { ...DEFAULT_SETTINGS_JSON.business, ...(data.business as object) },
    limits: { ...DEFAULT_SETTINGS_JSON.limits, ...(data.limits as object) },
    aiProviders: (data.ai_providers as SystemSettings["aiProviders"]) ?? [],
    rendering: { ...DEFAULT_SETTINGS_JSON.rendering, ...(data.rendering as object) },
    storage: { ...DEFAULT_SETTINGS_JSON.storage, ...(data.storage as object) },
    security: { ...DEFAULT_SETTINGS_JSON.security, ...(data.security as object) },
    maintenance: { ...DEFAULT_SETTINGS_JSON.maintenance, ...(data.maintenance as object) },
    killSwitches: { ...DEFAULT_SETTINGS_JSON.killSwitches, ...(data.kill_switches as object) },
    supportContact: { ...DEFAULT_SETTINGS_JSON.supportContact, ...(data.support_contact as object) },
    subscriptionContact: { ...DEFAULT_SETTINGS_JSON.subscriptionContact, ...(data.subscription_contact as object) },
    paymentContact: { ...DEFAULT_SETTINGS_JSON.paymentContact, ...(data.payment_contact as object) },
  } as SystemSettings;
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("feature_flags").select("*").order("id");
  return (data ?? []).map((f) => ({
    id: f.id as FeatureFlag["id"],
    labelAr: f.label_ar,
    labelEn: f.label_en,
    description: f.description,
    enabled: f.enabled,
    updatedAt: f.updated_at,
    updatedBy: f.updated_by ?? "",
  }));
}

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const [{ data: logs }, { data: profiles }] = await Promise.all([
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? ""]));

  return (logs ?? []).map((l) => ({
    id: l.id,
    admin: l.admin_id ? (nameById.get(l.admin_id) ?? l.admin_id) : "",
    action: l.action,
    entity: l.entity,
    entityId: l.entity_id,
    targetUser: l.target_user ? (nameById.get(l.target_user) ?? l.target_user) : null,
    oldValue: l.old_value,
    newValue: l.new_value,
    reason: l.reason,
    createdAt: l.created_at,
  }));
}

// System health is computed live (not stored/editable) — each check is a
// cheap real probe, so this page never shows fabricated status.
export async function getSystemHealth(): Promise<SystemHealthServiceEntry[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const dbCheck = await supabase.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
  const authConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const storageCheck = await supabase.storage.listBuckets();

  return [
    {
      id: "database",
      nameAr: "قاعدة البيانات",
      nameEn: "Database",
      status: dbCheck.error ? "down" : "operational",
      lastCheckedAt: now,
      note: dbCheck.error?.message ?? null,
    },
    {
      id: "auth",
      nameAr: "المصادقة",
      nameEn: "Authentication",
      status: authConfigured ? "operational" : "not_configured",
      lastCheckedAt: now,
      note: authConfigured ? null : "SUPABASE_SERVICE_ROLE_KEY not configured",
    },
    {
      id: "storage",
      nameAr: "التخزين",
      nameEn: "Storage",
      status: storageCheck.error ? "down" : (storageCheck.data?.length ?? 0) > 0 ? "operational" : "not_configured",
      lastCheckedAt: now,
      note: storageCheck.error?.message ?? null,
    },
    {
      id: "ai",
      nameAr: "الذكاء الاصطناعي",
      nameEn: "AI generation",
      status: "not_configured",
      lastCheckedAt: now,
      note: "لم يتم ربط أي مزود AI بعد — مرحلة قادمة / no AI provider connected yet — next phase",
    },
  ];
}

// ---- Localization (requires migration 008) ----
const DEFAULT_LOCALIZATION: LocalizationSettings = {
  arabicEnabled: true,
  englishEnabled: true,
  defaultLocale: "ar",
  currencyDisplay: "IQD",
  dateFormat: "gregorian",
};

export async function getLocalizationSettings(): Promise<LocalizationSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("localization_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return DEFAULT_LOCALIZATION;
  return {
    arabicEnabled: data.arabic_enabled,
    englishEnabled: data.english_enabled,
    defaultLocale: data.default_locale as LocalizationSettings["defaultLocale"],
    currencyDisplay: data.currency_display as LocalizationSettings["currencyDisplay"],
    dateFormat: data.date_format as LocalizationSettings["dateFormat"],
  };
}

// ---- Email ----
export async function getEmailSettings(): Promise<EmailSettings> {
  const supabase = await createClient();
  const [{ data: settings }, { data: templates }] = await Promise.all([
    supabase.from("email_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("email_templates").select("*").order("id"),
  ]);

  return {
    senderName: settings?.sender_name ?? "MOVO",
    replyTo: settings?.reply_to ?? "",
    supportEmail: settings?.support_email ?? "",
    templates: (templates ?? []).map((tpl) => ({
      id: tpl.id as EmailSettings["templates"][number]["id"],
      subjectAr: tpl.subject_ar,
      subjectEn: tpl.subject_en,
      bodyAr: tpl.body_ar,
      bodyEn: tpl.body_en,
    })),
  };
}
