"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SettingsSection } from "@/components/admin/ui/SettingsSection";
import { Toggle } from "@/components/admin/ui/Toggle";
import { TextInput } from "@/components/admin/ui/FormField";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import type { NavigationConfiguration } from "@/lib/admin/types/site";
import { updateNavigationAction } from "@/lib/admin/actions/site-appearance-actions";

export function NavigationView({ navigation: initial }: { navigation: NavigationConfiguration }) {
  const { t } = useI18n();
  const [nav, setNav] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateNavigationAction(nav);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <AdminPageHeader
        title={t("admin.nav.navigation")}
        description={t("admin.navigation.subtitle")}
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-4" />
            {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
          </Button>
        }
      />

      {error && <AuthError message={error} />}

      {(["desktop", "footer"] as const).map((section) => (
        <SettingsSection key={section} title={section === "desktop" ? t("admin.navigation.desktopNav") : t("admin.navigation.footerNav")}>
          {nav[section].flatMap((group) => group.items).map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 border-b border-border-subtle py-3 last:border-0">
              <TextInput
                value={item.labelAr}
                onChange={(v) =>
                  setNav((prev) => ({
                    ...prev,
                    [section]: prev[section].map((g) => ({
                      ...g,
                      items: g.items.map((it) => (it.id === item.id ? { ...it, labelAr: v } : it)),
                    })),
                  }))
                }
              />
              <span className="text-xs text-muted">{item.href}</span>
              <div className="ms-auto flex items-center gap-2">
                <span className="text-xs text-muted">{t("admin.common.enabled")}</span>
                <Toggle
                  checked={item.enabled}
                  onChange={(v) =>
                    setNav((prev) => ({
                      ...prev,
                      [section]: prev[section].map((g) => ({
                        ...g,
                        items: g.items.map((it) => (it.id === item.id ? { ...it, enabled: v } : it)),
                      })),
                    }))
                  }
                />
              </div>
            </div>
          ))}
        </SettingsSection>
      ))}
    </div>
  );
}
