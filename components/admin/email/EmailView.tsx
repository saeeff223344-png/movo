"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SettingsSection } from "@/components/admin/ui/SettingsSection";
import { FieldLabel, TextInput } from "@/components/admin/ui/FormField";
import { BilingualField } from "@/components/admin/ui/BilingualField";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AuthError } from "@/components/auth/AuthError";
import type { EmailSettings, EmailTemplate } from "@/lib/admin/types/system";
import { updateEmailSettingsAction, updateEmailTemplateAction } from "@/lib/admin/actions/system-actions";

export function EmailView({ settings: initial }: { settings: EmailSettings }) {
  const { t } = useI18n();
  const [settings, setSettings] = useState(initial);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateEmailSettingsAction(settings);
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
        title={t("admin.nav.email")}
        description={t("admin.email.subtitle")}
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-4" />
            {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
          </Button>
        }
      />

      {error && <AuthError message={error} />}

      <SettingsSection title={t("admin.email.senderTitle")}>
        <div className="grid grid-cols-2 gap-4">
          <FieldLabel label={t("admin.email.senderName")}>
            <TextInput value={settings.senderName} onChange={(v) => setSettings({ ...settings, senderName: v })} dir="ltr" />
          </FieldLabel>
          <FieldLabel label={t("admin.email.replyTo")}>
            <TextInput value={settings.replyTo} onChange={(v) => setSettings({ ...settings, replyTo: v })} dir="ltr" />
          </FieldLabel>
        </div>
        <p className="text-xs text-muted">{t("admin.email.secretsHint")}</p>
      </SettingsSection>

      <SettingsSection title={t("admin.email.templatesTitle")}>
        {settings.templates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => setEditing(tpl)}
            className="flex w-full items-center justify-between rounded-xl border border-border-subtle bg-base px-4 py-3 text-start transition-colors hover:border-border-strong"
          >
            <span>
              <span className="block text-sm font-semibold text-primary">{t(`admin.emailTemplate.${tpl.id}`)}</span>
              <span className="block text-xs text-muted">{tpl.subjectAr}</span>
            </span>
          </button>
        ))}
      </SettingsSection>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? t(`admin.emailTemplate.${editing.id}`) : ""}>
        {editing && (
          <EmailTemplateForm
            template={editing}
            onSave={(next) => {
              setSettings({ ...settings, templates: settings.templates.map((t2) => (t2.id === next.id ? next : t2)) });
              setEditing(null);
              void updateEmailTemplateAction(next);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function EmailTemplateForm({ template, onSave }: { template: EmailTemplate; onSave: (t: EmailTemplate) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState(template);

  return (
    <div className="space-y-4">
      <BilingualField label={t("admin.email.subject")} valueAr={form.subjectAr} valueEn={form.subjectEn} onChangeAr={(v) => setForm({ ...form, subjectAr: v })} onChangeEn={(v) => setForm({ ...form, subjectEn: v })} />
      <BilingualField label={t("admin.email.body")} valueAr={form.bodyAr} valueEn={form.bodyEn} onChangeAr={(v) => setForm({ ...form, bodyAr: v })} onChangeEn={(v) => setForm({ ...form, bodyEn: v })} multiline />
      <Button className="w-full" onClick={() => onSave(form)}>
        {t("admin.common.saveChanges")}
      </Button>
    </div>
  );
}
