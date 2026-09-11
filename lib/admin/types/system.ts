import type { Locale } from "@/lib/i18n/config";

export type EmailTemplateId =
  | "welcome"
  | "email_verification"
  | "password_reset"
  | "subscription_activated"
  | "subscription_expiring"
  | "payment_verified";

export type EmailTemplate = {
  id: EmailTemplateId;
  subjectAr: string;
  subjectEn: string;
  bodyAr: string;
  bodyEn: string;
};

export type EmailSettings = {
  senderName: string;
  replyTo: string;
  supportEmail: string;
  templates: EmailTemplate[];
};

export type LocalizationSettings = {
  arabicEnabled: boolean;
  englishEnabled: boolean;
  defaultLocale: Locale;
  currencyDisplay: "IQD" | "USD" | "both";
  dateFormat: "gregorian" | "hijri_gregorian";
};

export type ContactChannel = {
  enabled: boolean;
  value: string;
};

export type SupportContactSettings = {
  phone: ContactChannel;
  whatsapp: ContactChannel;
  email: ContactChannel;
  telegram: ContactChannel;
  instagram: ContactChannel;
  facebook: ContactChannel;
  x: ContactChannel;
  workingHours: string;
  primaryChannel: "phone" | "whatsapp" | "email" | "telegram";
  countryCode: string;
};

export type SubscriptionContactSettings = {
  phone: ContactChannel;
  whatsapp: ContactChannel;
  email: ContactChannel;
  instructionsAr: string;
  instructionsEn: string;
};

export type PaymentContactSettings = {
  phone: ContactChannel;
  whatsapp: ContactChannel;
  instructionsAr: string;
  instructionsEn: string;
};

export type BusinessInfo = {
  displayName: string;
  legalName: string;
  country: string;
  currency: "IQD";
  timezone: string;
  description: string;
};

export type SystemLimits = {
  maxPromptLength: number;
  maxUploadMb: number;
  allowedUploadTypes: string[];
  maxAssetsPerProject: number;
  maxVideoDurationSeconds: number;
  maxProjectsPerUser: number;
  maxRevisionsPerProject: number;
  maxGenerationsPerDay: number;
  maxGenerationsPerMonth: number;
  maxConcurrentJobs: number;
  renderRetries: number;
  storageLimitMb: number;
};

export type AiProviderConfig = {
  id: string;
  capability: "text" | "image" | "video" | "voice";
  provider: string;
  model: string;
  enabled: boolean;
  priority: number;
};

export type RenderingSettings = {
  defaultResolution: "1080p";
  resolution2kEnabled: boolean;
  resolution4kEnabled: boolean;
  fps: number;
  format: "mp4";
  timeoutSeconds: number;
  retryLimit: number;
};

export type StorageSettings = {
  provider: string;
  uploadLimitMb: number;
  allowedMimeTypes: string[];
  videoRetentionDays: number;
  assetRetentionDays: number;
  storageQuotaGb: number;
};

export type SecuritySettings = {
  requireStrongPasswords: boolean;
  adminSessionDurationMinutes: number;
  forcePasswordChangeOnFirstLogin: boolean;
  twoFactorEnabled: boolean;
  maxLoginAttempts: number;
  inactivityTimeoutMinutes: number;
};

export type MaintenanceSettings = {
  enabled: boolean;
  messageAr: string;
  messageEn: string;
  estimatedCompletion: string | null;
  allowAdminAccess: boolean;
};

export type KillSwitches = {
  registrationsPaused: boolean;
  generationPaused: boolean;
  renderingPaused: boolean;
  subscriptionActivationPaused: boolean;
  aiVideoPaused: boolean;
  uploadsPaused: boolean;
};

export type SystemSettings = {
  business: BusinessInfo;
  limits: SystemLimits;
  aiProviders: AiProviderConfig[];
  rendering: RenderingSettings;
  storage: StorageSettings;
  security: SecuritySettings;
  maintenance: MaintenanceSettings;
  killSwitches: KillSwitches;
  supportContact: SupportContactSettings;
  subscriptionContact: SubscriptionContactSettings;
  paymentContact: PaymentContactSettings;
};

export type FeatureFlagId =
  | "registration_enabled"
  | "login_enabled"
  | "generation_enabled"
  | "rendering_enabled"
  | "subscriptions_enabled"
  | "trial_enabled"
  | "activation_codes_enabled"
  | "support_enabled"
  | "voiceover_enabled"
  | "ai_images_enabled"
  | "ai_video_enabled"
  | "2k_enabled"
  | "4k_enabled"
  | "examples_enabled"
  | "announcements_enabled"
  | "maintenance_enabled";

export type FeatureFlag = {
  id: FeatureFlagId;
  labelAr: string;
  labelEn: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
};

export type AuditLogEntry = {
  id: string;
  admin: string;
  action: string;
  entity: string;
  entityId: string | null;
  targetUser: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
};

export type SystemHealthStatus = "operational" | "degraded" | "down" | "not_configured";

export type SystemHealthServiceEntry = {
  id: string;
  nameAr: string;
  nameEn: string;
  status: SystemHealthStatus;
  lastCheckedAt: string;
  note: string | null;
};
