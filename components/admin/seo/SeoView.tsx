"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SettingsSection, SettingsRow } from "@/components/admin/ui/SettingsSection";
import { FieldLabel, TextInput, TextArea } from "@/components/admin/ui/FormField";
import { Toggle } from "@/components/admin/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import type { SeoSettings } from "@/lib/admin/types/site";
import { updateSeoSettingsAction } from "@/lib/admin/actions/site-appearance-actions";

export function SeoView({ settings: initial }: { settings: SeoSettings }) {
  const { t } = useI18n();
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateSeoSettingsAction(settings);
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
        title={t("admin.nav.seo")}
        description={t("admin.seo.subtitle")}
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-4" />
            {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
          </Button>
        }
      />

      {error && <AuthError message={error} />}

      <SettingsSection title={t("admin.seo.defaultTitle")}>
        <FieldLabel label={t("admin.seo.siteTitle")}>
          <TextInput value={settings.siteTitle} onChange={(v) => setSettings({ ...settings, siteTitle: v })} dir="ltr" />
        </FieldLabel>
        <FieldLabel label={t("admin.seo.titleTemplate")}>
          <TextInput value={settings.titleTemplate} onChange={(v) => setSettings({ ...settings, titleTemplate: v })} dir="ltr" />
        </FieldLabel>
        <FieldLabel label={t("admin.seo.description")}>
          <TextArea value={settings.descriptionAr} onChange={(v) => setSettings({ ...settings, descriptionAr: v })} dir="rtl" rows={3} />
        </FieldLabel>
        <FieldLabel label={t("admin.seo.ogTitle")}>
          <TextInput value={settings.ogTitle} onChange={(v) => setSettings({ ...settings, ogTitle: v })} />
        </FieldLabel>
        <SettingsRow label={t("admin.seo.robotsIndex")}>
          <Toggle checked={settings.robotsIndex} onChange={(v) => setSettings({ ...settings, robotsIndex: v })} />
        </SettingsRow>
        <SettingsRow label={t("admin.seo.robotsFollow")}>
          <Toggle checked={settings.robotsFollow} onChange={(v) => setSettings({ ...settings, robotsFollow: v })} />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
