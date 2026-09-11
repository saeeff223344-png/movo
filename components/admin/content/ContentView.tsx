"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SettingsSection } from "@/components/admin/ui/SettingsSection";
import { BilingualField } from "@/components/admin/ui/BilingualField";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import type { AboutPageContent } from "@/lib/admin/types/content";
import { updateAboutContentAction } from "@/lib/admin/actions/site-content-actions";

export function ContentView({ content: initial }: { content: AboutPageContent }) {
  const { t } = useI18n();
  const [content, setContent] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateAboutContentAction(content);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  function update<K extends keyof AboutPageContent>(key: K, value: AboutPageContent[K]) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="max-w-3xl space-y-6">
      <AdminPageHeader
        title={t("admin.nav.content")}
        description={t("admin.content.subtitle")}
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-4" />
            {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
          </Button>
        }
      />

      {error && <AuthError message={error} />}

      <SettingsSection title={t("admin.content.aboutTitle")} description={t("admin.content.aboutDesc")}>
        <BilingualField label={t("admin.content.pageTitle")} valueAr={content.pageTitleAr} valueEn={content.pageTitleEn} onChangeAr={(v) => update("pageTitleAr", v)} onChangeEn={(v) => update("pageTitleEn", v)} />
        <BilingualField label={t("admin.content.intro")} valueAr={content.introAr} valueEn={content.introEn} onChangeAr={(v) => update("introAr", v)} onChangeEn={(v) => update("introEn", v)} />
        <BilingualField label={t("admin.content.story")} valueAr={content.storyAr} valueEn={content.storyEn} onChangeAr={(v) => update("storyAr", v)} onChangeEn={(v) => update("storyEn", v)} multiline />
        <BilingualField label={t("admin.content.mission")} valueAr={content.missionAr} valueEn={content.missionEn} onChangeAr={(v) => update("missionAr", v)} onChangeEn={(v) => update("missionEn", v)} multiline />
        <BilingualField label={t("admin.content.vision")} valueAr={content.visionAr} valueEn={content.visionEn} onChangeAr={(v) => update("visionAr", v)} onChangeEn={(v) => update("visionEn", v)} multiline />
        <BilingualField label={t("admin.content.values")} valueAr={content.valuesAr} valueEn={content.valuesEn} onChangeAr={(v) => update("valuesAr", v)} onChangeEn={(v) => update("valuesEn", v)} multiline />
        <BilingualField label={t("admin.content.cta")} valueAr={content.ctaTextAr} valueEn={content.ctaTextEn} onChangeAr={(v) => update("ctaTextAr", v)} onChangeEn={(v) => update("ctaTextEn", v)} />
      </SettingsSection>
    </div>
  );
}
