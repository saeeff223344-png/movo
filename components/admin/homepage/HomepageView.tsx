"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SettingsSection, SettingsRow } from "@/components/admin/ui/SettingsSection";
import { BilingualField } from "@/components/admin/ui/BilingualField";
import { Toggle } from "@/components/admin/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import { updateHomepageConfigAction } from "@/lib/admin/actions/site-content-actions";
import type { HomepageConfiguration } from "@/lib/admin/types/content";

export function HomepageView({ config: initialConfig }: { config: HomepageConfiguration }) {
  const { t } = useI18n();
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function moveSection(index: number, direction: -1 | 1) {
    const sections = [...config.sections];
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    setConfig({ ...config, sections: sections.map((s, i) => ({ ...s, displayOrder: i + 1 })) });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await updateHomepageConfigAction(config);
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
        title={t("admin.nav.homepage")}
        description={t("admin.homepage.subtitle")}
        actions={
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="size-4" />
            {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
          </Button>
        }
      />

      {error && <AuthError message={error} />}

      <SettingsSection title={t("admin.homepage.heroTitle")} description={t("admin.homepage.heroDesc")}>
        <BilingualField
          label={t("admin.homepage.badge")}
          valueAr={config.hero.badgeAr}
          valueEn={config.hero.badgeEn}
          onChangeAr={(v) => setConfig({ ...config, hero: { ...config.hero, badgeAr: v } })}
          onChangeEn={(v) => setConfig({ ...config, hero: { ...config.hero, badgeEn: v } })}
        />
        <BilingualField
          label={t("admin.homepage.title")}
          valueAr={config.hero.titleAr}
          valueEn={config.hero.titleEn}
          onChangeAr={(v) => setConfig({ ...config, hero: { ...config.hero, titleAr: v } })}
          onChangeEn={(v) => setConfig({ ...config, hero: { ...config.hero, titleEn: v } })}
        />
        <BilingualField
          label={t("admin.homepage.heroSubtitleField")}
          valueAr={config.hero.subtitleAr}
          valueEn={config.hero.subtitleEn}
          onChangeAr={(v) => setConfig({ ...config, hero: { ...config.hero, subtitleAr: v } })}
          onChangeEn={(v) => setConfig({ ...config, hero: { ...config.hero, subtitleEn: v } })}
          multiline
        />
        <BilingualField
          label={t("admin.homepage.promptPlaceholder")}
          valueAr={config.hero.promptPlaceholderAr}
          valueEn={config.hero.promptPlaceholderEn}
          onChangeAr={(v) => setConfig({ ...config, hero: { ...config.hero, promptPlaceholderAr: v } })}
          onChangeEn={(v) => setConfig({ ...config, hero: { ...config.hero, promptPlaceholderEn: v } })}
        />
        <BilingualField
          label={t("admin.homepage.ctaText")}
          valueAr={config.hero.ctaTextAr}
          valueEn={config.hero.ctaTextEn}
          onChangeAr={(v) => setConfig({ ...config, hero: { ...config.hero, ctaTextAr: v } })}
          onChangeEn={(v) => setConfig({ ...config, hero: { ...config.hero, ctaTextEn: v } })}
        />
        <SettingsRow label={t("admin.homepage.previewVisible")}>
          <Toggle
            checked={config.hero.previewVisible}
            onChange={(v) => setConfig({ ...config, hero: { ...config.hero, previewVisible: v } })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t("admin.homepage.sectionsTitle")} description={t("admin.homepage.sectionsDesc")}>
        {config.sections.map((section, i) => (
          <div key={section.id} className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-0">
            <div className="flex flex-col">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => moveSection(i, -1)}
                className="text-muted hover:text-primary disabled:opacity-30"
                aria-label="move up"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={i === config.sections.length - 1}
                onClick={() => moveSection(i, 1)}
                className="text-muted hover:text-primary disabled:opacity-30"
                aria-label="move down"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">{section.titleAr}</p>
              <p className="text-xs text-muted">{section.titleEn}</p>
            </div>
            <Toggle
              checked={section.enabled}
              onChange={(v) =>
                setConfig({
                  ...config,
                  sections: config.sections.map((s) => (s.id === section.id ? { ...s, enabled: v } : s)),
                })
              }
            />
          </div>
        ))}
      </SettingsSection>
    </div>
  );
}
