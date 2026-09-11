"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SettingsSection, SettingsRow } from "@/components/admin/ui/SettingsSection";
import { TextInput } from "@/components/admin/ui/FormField";
import { Toggle } from "@/components/admin/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import type { SocialLink } from "@/lib/admin/types/site";
import { updateSocialLinksAction } from "@/lib/admin/actions/site-appearance-actions";

export function SocialView({ links: initial }: { links: SocialLink[] }) {
  const { t } = useI18n();
  const [links, setLinks] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateSocialLinksAction(links);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-2xl">
      <AdminPageHeader
        title={t("admin.nav.social")}
        description={t("admin.social.subtitle")}
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-4" />
            {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
          </Button>
        }
      />

      {error && <AuthError message={error} />}

      <SettingsSection title={t("admin.social.channelsTitle")}>
        {links.map((link) => (
          <SettingsRow key={link.id} label={t(`admin.socialPlatform.${link.platform}`)}>
            <div className="flex items-center gap-2">
              <TextInput
                value={link.url}
                onChange={(v) => setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, url: v } : l)))}
                dir="ltr"
                placeholder="https://"
              />
              <Toggle
                checked={link.enabled}
                onChange={(v) => setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, enabled: v } : l)))}
              />
            </div>
          </SettingsRow>
        ))}
      </SettingsSection>
    </div>
  );
}
