"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { BilingualField } from "@/components/admin/ui/BilingualField";
import { FieldLabel, TextInput } from "@/components/admin/ui/FormField";
import { SettingsRow } from "@/components/admin/ui/SettingsSection";
import { Toggle } from "@/components/admin/ui/Toggle";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { AuthError } from "@/components/auth/AuthError";
import type { DeveloperProfile } from "@/lib/admin/types/content";
import { updateDeveloperAction, deleteDeveloperAction } from "@/lib/admin/actions/site-content-actions";

export function DeveloperDetailView({ developer }: { developer: DeveloperProfile }) {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState(developer);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function update<K extends keyof DeveloperProfile>(key: K, value: DeveloperProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateDeveloperAction(developer.id, form);
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
      <AdminPageHeader title={form.nameAr || t("admin.developers.newTitle")} backHref="/admin/developers" />

      <div className="space-y-5 rounded-2xl border border-border-subtle bg-surface p-6">
        <BilingualField label={t("admin.developers.name")} valueAr={form.nameAr} valueEn={form.nameEn} onChangeAr={(v) => update("nameAr", v)} onChangeEn={(v) => update("nameEn", v)} />
        <BilingualField label={t("admin.developers.jobTitle")} valueAr={form.jobTitleAr} valueEn={form.jobTitleEn} onChangeAr={(v) => update("jobTitleAr", v)} onChangeEn={(v) => update("jobTitleEn", v)} />
        <BilingualField label={t("admin.developers.bio")} valueAr={form.bioAr} valueEn={form.bioEn} onChangeAr={(v) => update("bioAr", v)} onChangeEn={(v) => update("bioEn", v)} multiline />

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label={t("admin.developers.email")}>
            <TextInput value={form.email ?? ""} onChange={(v) => update("email", v || null)} dir="ltr" />
          </FieldLabel>
          <FieldLabel label={t("admin.developers.whatsapp")}>
            <TextInput value={form.whatsapp ?? ""} onChange={(v) => update("whatsapp", v || null)} dir="ltr" />
          </FieldLabel>
          <FieldLabel label="GitHub">
            <TextInput value={form.github ?? ""} onChange={(v) => update("github", v || null)} dir="ltr" />
          </FieldLabel>
          <FieldLabel label="LinkedIn">
            <TextInput value={form.linkedin ?? ""} onChange={(v) => update("linkedin", v || null)} dir="ltr" />
          </FieldLabel>
          <FieldLabel label={t("admin.developers.website")}>
            <TextInput value={form.website ?? ""} onChange={(v) => update("website", v || null)} dir="ltr" />
          </FieldLabel>
          <FieldLabel label="Instagram">
            <TextInput value={form.instagram ?? ""} onChange={(v) => update("instagram", v || null)} dir="ltr" />
          </FieldLabel>
        </div>

        <SettingsRow label={t("admin.examples.featured")}>
          <Toggle checked={form.featured} onChange={(v) => update("featured", v)} />
        </SettingsRow>
        <SettingsRow label={t("admin.common.visible")}>
          <Toggle checked={form.visible} onChange={(v) => update("visible", v)} />
        </SettingsRow>

        {error && <AuthError message={error} />}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-4" />
            {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" />
            {t("admin.actions.delete")}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteDeveloperAction(developer.id);
          router.push("/admin/developers");
        }}
        title={t("admin.actions.delete")}
        description={t("admin.confirm.deleteDeveloper")}
        confirmLabel={t("admin.actions.delete")}
        danger
      />
    </div>
  );
}
