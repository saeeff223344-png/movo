"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Toggle } from "@/components/admin/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { BilingualField } from "@/components/admin/ui/BilingualField";
import { FieldLabel, SelectField } from "@/components/admin/ui/FormField";
import type { Announcement, AnnouncementLocation, AnnouncementType } from "@/lib/admin/types/support";
import { createAnnouncementAction, updateAnnouncementAction } from "@/lib/admin/actions/support-actions";

const TYPE_TONE: Record<AnnouncementType, "info" | "success" | "warning" | "danger" | "neutral"> = {
  info: "info",
  success: "success",
  warning: "warning",
  promotion: "info",
  maintenance: "danger",
};

export function AnnouncementsView({ announcements: initial }: { announcements: Announcement[] }) {
  const { t } = useI18n();
  const [announcements, setAnnouncements] = useState(initial);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [creating, setCreating] = useState(false);

  const draft = editing ?? {
    id: "",
    titleAr: "",
    titleEn: "",
    messageAr: "",
    messageEn: "",
    type: "info" as AnnouncementType,
    location: "global" as AnnouncementLocation,
    startAt: null,
    endAt: null,
    dismissible: true,
    enabled: true,
    audience: "all" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: "المدير العام",
  };

  async function saveDraft(next: Announcement) {
    if (editing) {
      setAnnouncements((prev) => prev.map((a) => (a.id === next.id ? next : a)));
      setEditing(null);
      await updateAnnouncementAction(next.id, next);
    } else {
      setCreating(false);
      const result = await createAnnouncementAction(next);
      if (result.ok) {
        setAnnouncements((prev) => [{ ...next, id: result.id }, ...prev]);
      }
    }
  }

  const open = editing !== null || creating;

  return (
    <div>
      <AdminPageHeader
        title={t("admin.nav.announcements")}
        description={t("admin.announcements.subtitle")}
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            {t("admin.announcements.create")}
          </Button>
        }
      />

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border-subtle bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <StatusBadge label={t(`admin.announcementType.${a.type}`)} tone={TYPE_TONE[a.type]} />
                  <StatusBadge label={t(`admin.announcementLocation.${a.location}`)} tone="neutral" />
                </div>
                <button type="button" onClick={() => setEditing(a)} className="text-start">
                  <p className="font-semibold text-primary hover:text-brand-400">{a.titleAr}</p>
                  <p className="text-sm text-muted">{a.messageAr}</p>
                </button>
              </div>
              <Toggle
                checked={a.enabled}
                onChange={(v) => {
                  setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, enabled: v } : x)));
                  void updateAnnouncementAction(a.id, { enabled: v });
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => { setEditing(null); setCreating(false); }} title={editing ? t("admin.announcements.edit") : t("admin.announcements.create")}>
        <AnnouncementForm initial={draft} onSave={saveDraft} />
      </Modal>
    </div>
  );
}

function AnnouncementForm({ initial, onSave }: { initial: Announcement; onSave: (a: Announcement) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState(initial);

  return (
    <div className="space-y-4">
      <BilingualField
        label={t("admin.announcements.title")}
        valueAr={form.titleAr}
        valueEn={form.titleEn}
        onChangeAr={(v) => setForm({ ...form, titleAr: v })}
        onChangeEn={(v) => setForm({ ...form, titleEn: v })}
      />
      <BilingualField
        label={t("admin.announcements.message")}
        valueAr={form.messageAr}
        valueEn={form.messageEn}
        onChangeAr={(v) => setForm({ ...form, messageAr: v })}
        onChangeEn={(v) => setForm({ ...form, messageEn: v })}
        multiline
      />
      <div className="grid grid-cols-2 gap-3">
        <FieldLabel label={t("admin.announcements.type")}>
          <SelectField
            value={form.type}
            onChange={(v: AnnouncementType) => setForm({ ...form, type: v })}
            options={["info", "success", "warning", "promotion", "maintenance"].map((v) => ({
              value: v as AnnouncementType,
              label: t(`admin.announcementType.${v}`),
            }))}
          />
        </FieldLabel>
        <FieldLabel label={t("admin.announcements.location")}>
          <SelectField
            value={form.location}
            onChange={(v: AnnouncementLocation) => setForm({ ...form, location: v })}
            options={["homepage", "dashboard", "subscription", "global"].map((v) => ({
              value: v as AnnouncementLocation,
              label: t(`admin.announcementLocation.${v}`),
            }))}
          />
        </FieldLabel>
      </div>
      <Button className="w-full" onClick={() => onSave(form)}>
        {t("admin.common.saveChanges")}
      </Button>
    </div>
  );
}
