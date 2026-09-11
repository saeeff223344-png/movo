"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SettingsSection, SettingsRow } from "@/components/admin/ui/SettingsSection";
import { BilingualField } from "@/components/admin/ui/BilingualField";
import { FieldLabel, TextInput } from "@/components/admin/ui/FormField";
import { Toggle } from "@/components/admin/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import type { FooterSettings } from "@/lib/admin/types/site";
import { updateFooterSettingsAction } from "@/lib/admin/actions/site-appearance-actions";

export function FooterView({ settings: initial }: { settings: FooterSettings }) {
  const { t } = useI18n();
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateFooterSettingsAction(settings);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <AdminPageHeader
        title={t("admin.nav.footer")}
        description={t("admin.footer.subtitle")}
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-4" />
            {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
          </Button>
        }
      />

      {error && <AuthError message={error} />}

      <SettingsSection title={t("admin.footer.contentTitle")}>
        <BilingualField
          label={t("admin.footer.shortDescription")}
          valueAr={settings.shortDescriptionAr}
          valueEn={settings.shortDescriptionEn}
          onChangeAr={(v) => setSettings({ ...settings, shortDescriptionAr: v })}
          onChangeEn={(v) => setSettings({ ...settings, shortDescriptionEn: v })}
          multiline
        />
        <BilingualField
          label={t("admin.footer.developerCredit")}
          valueAr={settings.developerCreditAr}
          valueEn={settings.developerCreditEn}
          onChangeAr={(v) => setSettings({ ...settings, developerCreditAr: v })}
          onChangeEn={(v) => setSettings({ ...settings, developerCreditEn: v })}
        />
        <div className="grid grid-cols-2 gap-4">
          <FieldLabel label={t("admin.footer.supportPhone")}>
            <TextInput value={settings.supportPhone} onChange={(v) => setSettings({ ...settings, supportPhone: v })} dir="ltr" />
          </FieldLabel>
          <FieldLabel label={t("admin.footer.supportEmail")}>
            <TextInput value={settings.supportEmail} onChange={(v) => setSettings({ ...settings, supportEmail: v })} dir="ltr" />
          </FieldLabel>
        </div>
        <SettingsRow label={t("admin.common.visible")}>
          <Toggle checked={settings.visible} onChange={(v) => setSettings({ ...settings, visible: v })} />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
