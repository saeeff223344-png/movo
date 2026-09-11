"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SettingsSection, SettingsRow } from "@/components/admin/ui/SettingsSection";
import { SelectField } from "@/components/admin/ui/FormField";
import { Toggle } from "@/components/admin/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import type { LocalizationSettings } from "@/lib/admin/types/system";
import { updateLocalizationSettingsAction } from "@/lib/admin/actions/system-actions";

export function LocalizationView({ settings: initial }: { settings: LocalizationSettings }) {
  const { t } = useI18n();
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateLocalizationSettingsAction(settings);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  function toggleLanguage(key: "arabicEnabled" | "englishEnabled", value: boolean) {
    const other = key === "arabicEnabled" ? settings.englishEnabled : settings.arabicEnabled;
    if (!value && !other) {
      setWarning(t("admin.localization.cannotDisableAll"));
      window.setTimeout(() => setWarning(null), 3000);
      return;
    }
    setSettings({ ...settings, [key]: value });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <AdminPageHeader
        title={t("admin.nav.localization")}
        description={t("admin.localization.subtitle")}
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-4" />
            {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
          </Button>
        }
      />

      {error && <AuthError message={error} />}
      {warning && <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-500">{warning}</div>}

      <SettingsSection title={t("admin.localization.languagesTitle")}>
        <SettingsRow label={t("langSwitch.label") + " — العربية"}>
          <Toggle checked={settings.arabicEnabled} onChange={(v) => toggleLanguage("arabicEnabled", v)} />
        </SettingsRow>
        <SettingsRow label={t("langSwitch.label") + " — English"}>
          <Toggle checked={settings.englishEnabled} onChange={(v) => toggleLanguage("englishEnabled", v)} />
        </SettingsRow>
        <SettingsRow label={t("admin.localization.defaultLocale")}>
          <SelectField
            value={settings.defaultLocale}
            onChange={(v) => setSettings({ ...settings, defaultLocale: v })}
            options={[
              { value: "ar", label: "العربية" },
              { value: "en", label: "English" },
            ]}
          />
        </SettingsRow>
        <SettingsRow label={t("admin.localization.currencyDisplay")}>
          <SelectField
            value={settings.currencyDisplay}
            onChange={(v) => setSettings({ ...settings, currencyDisplay: v })}
            options={[
              { value: "IQD", label: "IQD" },
              { value: "USD", label: "USD" },
              { value: "both", label: t("admin.localization.both") },
            ]}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
