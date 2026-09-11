"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { SettingsSection, SettingsRow } from "@/components/admin/ui/SettingsSection";
import { Toggle } from "@/components/admin/ui/Toggle";
import type { DeveloperProfile, DeveloperPageSettings } from "@/lib/admin/types/content";
import { createDeveloperAction, updateDeveloperPageSettingsAction } from "@/lib/admin/actions/site-content-actions";

export function DevelopersView({
  developers,
  pageSettings: initialSettings,
}: {
  developers: DeveloperProfile[];
  pageSettings: DeveloperPageSettings;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pageSettings, setPageSettings] = useState(initialSettings);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    const result = await createDeveloperAction();
    setCreating(false);
    if (result.ok) router.push(`/admin/developers/${result.id}`);
  }

  return (
    <div>
      <AdminPageHeader
        title={t("admin.nav.developers")}
        description={t("admin.developers.subtitle")}
        actions={
          <Button size="sm" onClick={handleCreate} disabled={creating}>
            <Plus className="size-4" />
            {creating ? t("common.loading") : t("admin.developers.create")}
          </Button>
        }
      />

      <div className="mb-6 max-w-2xl">
        <SettingsSection title={t("admin.developers.pageSettingsTitle")}>
          <SettingsRow label={t("admin.developers.sectionVisible")}>
            <Toggle
              checked={pageSettings.sectionVisible}
              onChange={(v) => {
                setPageSettings({ ...pageSettings, sectionVisible: v });
                void updateDeveloperPageSettingsAction({ sectionVisible: v });
              }}
            />
          </SettingsRow>
        </SettingsSection>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {developers.map((dev) => (
          <button
            key={dev.id}
            type="button"
            onClick={() => router.push(`/admin/developers/${dev.id}`)}
            className="rounded-2xl border border-border-subtle bg-surface p-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand-500/40"
          >
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-xl font-extrabold text-white">
              {dev.nameAr.charAt(0)}
            </div>
            <p className="mt-3 font-bold text-primary">{dev.nameAr}</p>
            <p className="text-sm text-brand-400">{dev.jobTitleAr}</p>
            <div className="mt-3 flex justify-center gap-2">
              {dev.featured && <StatusBadge label={t("admin.examples.featured")} tone="info" />}
              <StatusBadge label={dev.visible ? t("admin.common.visible") : t("admin.common.hidden")} tone={dev.visible ? "success" : "neutral"} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
