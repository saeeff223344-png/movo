"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SettingsSection, SettingsRow } from "@/components/admin/ui/SettingsSection";
import { SettingsSearch } from "@/components/admin/settings/SettingsSearch";
import { FieldLabel, NumberInput, TextInput } from "@/components/admin/ui/FormField";
import { Toggle } from "@/components/admin/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import type { SystemSettings, SubscriptionContactPerson } from "@/lib/admin/types/system";
import type { BrandingSettings } from "@/lib/admin/types/site";
import { updateSystemSettingsAction } from "@/lib/admin/actions/system-actions";
import { updateBrandingSettingsAction } from "@/lib/admin/actions/site-appearance-actions";
import { SubscriptionContactsManager } from "@/components/admin/settings/SubscriptionContactsManager";

const TABS = [
  "business",
  "brand",
  "contact",
  "limits",
  "ai",
  "rendering",
  "storage",
  "security",
  "maintenance",
] as const;
type TabId = (typeof TABS)[number];

export function SystemSettingsView({
  settings: initialSettings,
  branding: initialBranding,
  subscriptionContacts,
}: {
  settings: SystemSettings;
  branding: BrandingSettings;
  subscriptionContacts: SubscriptionContactPerson[];
}) {
  const { t } = useI18n();
  const [settings, setSettings] = useState(initialSettings);
  const [branding, setBranding] = useState(initialBranding);
  const [active, setActive] = useState<TabId>("business");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const [settingsResult, brandingResult] = await Promise.all([
      updateSystemSettingsAction(settings),
      updateBrandingSettingsAction(branding),
    ]);
    setSaving(false);
    if (!settingsResult.ok) {
      setError(settingsResult.error);
      return;
    }
    if (!brandingResult.ok) {
      setError(brandingResult.error);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  const tabRows = useMemo(
    () =>
      TABS.map((tab) => ({
        id: tab,
        label: t(`admin.settingsTab.${tab}`),
      })),
    [t],
  );

  const matchingTabs =
    search.trim().length === 0
      ? TABS
      : tabRows.filter((tab) => t(`admin.settingsTab.${tab.id}`).toLowerCase().includes(search.toLowerCase())).map((tab) => tab.id);

  return (
    <div>
      <AdminPageHeader
        title={t("admin.nav.settings")}
        description={t("admin.settings.subtitle")}
        actions={
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="size-4" />
            {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
          </Button>
        }
      />

      {error && <div className="mb-4"><AuthError message={error} /></div>}

      <div className="mb-5">
        <SettingsSearch value={search} onChange={setSearch} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {tabRows
            .filter((tab) => matchingTabs.includes(tab.id))
            .map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-start text-sm font-semibold transition-colors lg:w-full ${
                  active === tab.id ? "bg-brand-500/10 text-brand-400" : "text-secondary hover:bg-surface-hover hover:text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        <div>
          {active === "business" && (
            <SettingsSection title={t("admin.settingsTab.business")}>
              <FieldLabel label={t("admin.business.displayName")}>
                <TextInput value={settings.business.displayName} onChange={(v) => setSettings({ ...settings, business: { ...settings.business, displayName: v } })} />
              </FieldLabel>
              <FieldLabel label={t("admin.business.legalName")}>
                <TextInput value={settings.business.legalName} onChange={(v) => setSettings({ ...settings, business: { ...settings.business, legalName: v } })} />
              </FieldLabel>
              <div className="grid grid-cols-2 gap-4">
                <FieldLabel label={t("admin.business.country")}>
                  <TextInput value={settings.business.country} onChange={(v) => setSettings({ ...settings, business: { ...settings.business, country: v } })} />
                </FieldLabel>
                <FieldLabel label={t("admin.business.timezone")}>
                  <TextInput value={settings.business.timezone} onChange={(v) => setSettings({ ...settings, business: { ...settings.business, timezone: v } })} dir="ltr" />
                </FieldLabel>
              </div>
            </SettingsSection>
          )}

          {active === "brand" && (
            <SettingsSection title={t("admin.settingsTab.brand")}>
              <div className="grid grid-cols-2 gap-4">
                <FieldLabel label={t("admin.brand.nameEn")}>
                  <TextInput value={branding.brandNameEn} onChange={(v) => setBranding({ ...branding, brandNameEn: v })} dir="ltr" />
                </FieldLabel>
                <FieldLabel label={t("admin.brand.nameAr")}>
                  <TextInput value={branding.brandNameAr} onChange={(v) => setBranding({ ...branding, brandNameAr: v })} />
                </FieldLabel>
                <FieldLabel label={t("admin.brand.taglineAr")}>
                  <TextInput value={branding.taglineAr} onChange={(v) => setBranding({ ...branding, taglineAr: v })} />
                </FieldLabel>
                <FieldLabel label={t("admin.brand.taglineEn")}>
                  <TextInput value={branding.taglineEn} onChange={(v) => setBranding({ ...branding, taglineEn: v })} dir="ltr" />
                </FieldLabel>
              </div>
              <p className="text-xs text-muted">{t("admin.brand.logoHint")}</p>
            </SettingsSection>
          )}

          {active === "contact" && (
            <div className="space-y-6">
              <SettingsSection title={t("admin.contact.supportTitle")}>
                <SettingsRow label={t("admin.contact.whatsapp")}>
                  <TextInput value={settings.supportContact.whatsapp.value} onChange={(v) => setSettings({ ...settings, supportContact: { ...settings.supportContact, whatsapp: { ...settings.supportContact.whatsapp, value: v } } })} dir="ltr" />
                </SettingsRow>
                <SettingsRow label={t("admin.contact.email")}>
                  <TextInput value={settings.supportContact.email.value} onChange={(v) => setSettings({ ...settings, supportContact: { ...settings.supportContact, email: { ...settings.supportContact.email, value: v } } })} dir="ltr" />
                </SettingsRow>
                <SettingsRow label={t("admin.contact.workingHours")}>
                  <TextInput value={settings.supportContact.workingHours} onChange={(v) => setSettings({ ...settings, supportContact: { ...settings.supportContact, workingHours: v } })} />
                </SettingsRow>
              </SettingsSection>

              <SettingsSection title={t("admin.contact.subscriptionTitle")}>
                <SettingsRow label={t("admin.contact.whatsapp")}>
                  <TextInput value={settings.subscriptionContact.whatsapp.value} onChange={(v) => setSettings({ ...settings, subscriptionContact: { ...settings.subscriptionContact, whatsapp: { ...settings.subscriptionContact.whatsapp, value: v } } })} dir="ltr" />
                </SettingsRow>
              </SettingsSection>

              <SettingsSection
                title={t("admin.contact.subscriptionContactsTitle")}
                description={t("admin.contact.subscriptionContactsDesc")}
              >
                <SubscriptionContactsManager contacts={subscriptionContacts} />
              </SettingsSection>

              <SettingsSection title={t("admin.contact.paymentTitle")}>
                <SettingsRow label={t("admin.contact.whatsapp")}>
                  <TextInput value={settings.paymentContact.whatsapp.value} onChange={(v) => setSettings({ ...settings, paymentContact: { ...settings.paymentContact, whatsapp: { ...settings.paymentContact.whatsapp, value: v } } })} dir="ltr" />
                </SettingsRow>
              </SettingsSection>
            </div>
          )}

          {active === "limits" && (
            <SettingsSection title={t("admin.settingsTab.limits")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldLabel label={t("admin.limits.maxPromptLength")}>
                  <NumberInput value={settings.limits.maxPromptLength} onChange={(v) => setSettings({ ...settings, limits: { ...settings.limits, maxPromptLength: v } })} />
                </FieldLabel>
                <FieldLabel label={t("admin.limits.maxUploadMb")}>
                  <NumberInput value={settings.limits.maxUploadMb} onChange={(v) => setSettings({ ...settings, limits: { ...settings.limits, maxUploadMb: v } })} suffix="MB" />
                </FieldLabel>
                <FieldLabel label={t("admin.limits.maxVideoDuration")}>
                  <NumberInput value={settings.limits.maxVideoDurationSeconds} onChange={(v) => setSettings({ ...settings, limits: { ...settings.limits, maxVideoDurationSeconds: v } })} suffix="s" />
                </FieldLabel>
                <FieldLabel label={t("admin.limits.maxGenerationsPerDay")}>
                  <NumberInput value={settings.limits.maxGenerationsPerDay} onChange={(v) => setSettings({ ...settings, limits: { ...settings.limits, maxGenerationsPerDay: v } })} />
                </FieldLabel>
                <FieldLabel label={t("admin.limits.maxConcurrentJobs")}>
                  <NumberInput value={settings.limits.maxConcurrentJobs} onChange={(v) => setSettings({ ...settings, limits: { ...settings.limits, maxConcurrentJobs: v } })} />
                </FieldLabel>
                <FieldLabel label={t("admin.limits.renderRetries")}>
                  <NumberInput value={settings.limits.renderRetries} onChange={(v) => setSettings({ ...settings, limits: { ...settings.limits, renderRetries: v } })} />
                </FieldLabel>
              </div>
            </SettingsSection>
          )}

          {active === "ai" && (
            <SettingsSection title={t("admin.settingsTab.ai")} description={t("admin.ai.secretsHint")}>
              {settings.aiProviders.map((provider) => (
                <SettingsRow key={provider.id} label={`${provider.capability} — ${provider.provider}/${provider.model}`}>
                  <Toggle
                    checked={provider.enabled}
                    onChange={(v) =>
                      setSettings({
                        ...settings,
                        aiProviders: settings.aiProviders.map((p) => (p.id === provider.id ? { ...p, enabled: v } : p)),
                      })
                    }
                  />
                </SettingsRow>
              ))}
            </SettingsSection>
          )}

          {active === "rendering" && (
            <SettingsSection title={t("admin.settingsTab.rendering")}>
              <SettingsRow label="2K">
                <Toggle checked={settings.rendering.resolution2kEnabled} onChange={(v) => setSettings({ ...settings, rendering: { ...settings.rendering, resolution2kEnabled: v } })} />
              </SettingsRow>
              <SettingsRow label="4K">
                <Toggle checked={settings.rendering.resolution4kEnabled} onChange={(v) => setSettings({ ...settings, rendering: { ...settings.rendering, resolution4kEnabled: v } })} />
              </SettingsRow>
              <div className="grid grid-cols-2 gap-4">
                <FieldLabel label={t("admin.rendering.fps")}>
                  <NumberInput value={settings.rendering.fps} onChange={(v) => setSettings({ ...settings, rendering: { ...settings.rendering, fps: v } })} />
                </FieldLabel>
                <FieldLabel label={t("admin.rendering.timeout")}>
                  <NumberInput value={settings.rendering.timeoutSeconds} onChange={(v) => setSettings({ ...settings, rendering: { ...settings.rendering, timeoutSeconds: v } })} suffix="s" />
                </FieldLabel>
              </div>
            </SettingsSection>
          )}

          {active === "storage" && (
            <SettingsSection title={t("admin.settingsTab.storage")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldLabel label={t("admin.storage.uploadLimit")}>
                  <NumberInput value={settings.storage.uploadLimitMb} onChange={(v) => setSettings({ ...settings, storage: { ...settings.storage, uploadLimitMb: v } })} suffix="MB" />
                </FieldLabel>
                <FieldLabel label={t("admin.storage.quota")}>
                  <NumberInput value={settings.storage.storageQuotaGb} onChange={(v) => setSettings({ ...settings, storage: { ...settings.storage, storageQuotaGb: v } })} suffix="GB" />
                </FieldLabel>
                <FieldLabel label={t("admin.storage.videoRetention")}>
                  <NumberInput value={settings.storage.videoRetentionDays} onChange={(v) => setSettings({ ...settings, storage: { ...settings.storage, videoRetentionDays: v } })} suffix={t("admin.plans.days")} />
                </FieldLabel>
              </div>
            </SettingsSection>
          )}

          {active === "security" && (
            <SettingsSection title={t("admin.settingsTab.security")}>
              <SettingsRow label={t("admin.security.requireStrongPasswords")}>
                <Toggle checked={settings.security.requireStrongPasswords} onChange={(v) => setSettings({ ...settings, security: { ...settings.security, requireStrongPasswords: v } })} />
              </SettingsRow>
              <SettingsRow label={t("admin.security.forceChangeFirstLogin")}>
                <Toggle checked={settings.security.forcePasswordChangeOnFirstLogin} onChange={(v) => setSettings({ ...settings, security: { ...settings.security, forcePasswordChangeOnFirstLogin: v } })} />
              </SettingsRow>
              <SettingsRow label={t("admin.security.twoFactor")}>
                <Toggle checked={settings.security.twoFactorEnabled} onChange={(v) => setSettings({ ...settings, security: { ...settings.security, twoFactorEnabled: v } })} />
              </SettingsRow>
              <div className="grid grid-cols-2 gap-4">
                <FieldLabel label={t("admin.security.sessionDuration")}>
                  <NumberInput value={settings.security.adminSessionDurationMinutes} onChange={(v) => setSettings({ ...settings, security: { ...settings.security, adminSessionDurationMinutes: v } })} suffix={t("admin.security.minutes")} />
                </FieldLabel>
                <FieldLabel label={t("admin.security.maxLoginAttempts")}>
                  <NumberInput value={settings.security.maxLoginAttempts} onChange={(v) => setSettings({ ...settings, security: { ...settings.security, maxLoginAttempts: v } })} />
                </FieldLabel>
              </div>
            </SettingsSection>
          )}

          {active === "maintenance" && (
            <SettingsSection title={t("admin.settingsTab.maintenance")} description={t("admin.maintenance.desc")}>
              <SettingsRow label={t("admin.maintenance.enabled")}>
                <Toggle checked={settings.maintenance.enabled} onChange={(v) => setSettings({ ...settings, maintenance: { ...settings.maintenance, enabled: v } })} />
              </SettingsRow>
              <FieldLabel label={t("admin.maintenance.messageAr")}>
                <TextInput value={settings.maintenance.messageAr} onChange={(v) => setSettings({ ...settings, maintenance: { ...settings.maintenance, messageAr: v } })} />
              </FieldLabel>
              <FieldLabel label={t("admin.maintenance.messageEn")}>
                <TextInput value={settings.maintenance.messageEn} onChange={(v) => setSettings({ ...settings, maintenance: { ...settings.maintenance, messageEn: v } })} dir="ltr" />
              </FieldLabel>
              <SettingsRow label={t("admin.maintenance.allowAdminAccess")}>
                <Toggle checked={settings.maintenance.allowAdminAccess} onChange={(v) => setSettings({ ...settings, maintenance: { ...settings.maintenance, allowAdminAccess: v } })} />
              </SettingsRow>
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
}
