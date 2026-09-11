"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/admin/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { BilingualField } from "@/components/admin/ui/BilingualField";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import type { FaqItem } from "@/lib/admin/types/content";
import { createFaqAction, updateFaqAction, deleteFaqAction } from "@/lib/admin/actions/site-content-actions";

export function FaqView({ items: initial }: { items: FaqItem[] }) {
  const { t } = useI18n();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<FaqItem | null>(null);

  const draft: FaqItem = editing ?? {
    id: "",
    questionAr: "",
    questionEn: "",
    answerAr: "",
    answerEn: "",
    category: "general",
    displayOrder: items.length + 1,
    active: true,
  };

  return (
    <div>
      <AdminPageHeader
        title={t("admin.nav.faq")}
        description={t("admin.faq.subtitle")}
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            {t("admin.faq.create")}
          </Button>
        }
      />

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4">
            <button type="button" onClick={() => setEditing(item)} className="flex-1 text-start">
              <p className="font-semibold text-primary hover:text-brand-400">{item.questionAr}</p>
              <p className="mt-1 text-sm text-muted">{item.answerAr}</p>
            </button>
            <div className="flex items-center gap-2">
              <Toggle
                checked={item.active}
                onChange={(v) => {
                  setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, active: v } : x)));
                  void updateFaqAction(item.id, { active: v });
                }}
              />
              <button type="button" onClick={() => setDeleting(item)} className="text-muted hover:text-red-400" aria-label="delete">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={editing !== null || creating} onClose={() => { setEditing(null); setCreating(false); }} title={editing ? t("admin.faq.edit") : t("admin.faq.create")}>
        <FaqForm
          item={draft}
          onSave={async (next) => {
            setEditing(null);
            setCreating(false);
            if (editing) {
              setItems((prev) => prev.map((x) => (x.id === next.id ? next : x)));
              await updateFaqAction(next.id, next);
            } else {
              const result = await createFaqAction(next);
              if (result.ok) setItems((prev) => [...prev, { ...next, id: result.id }]);
            }
          }}
        />
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          setItems((prev) => prev.filter((x) => x.id !== deleting.id));
          void deleteFaqAction(deleting.id);
        }}
        title={t("admin.actions.delete")}
        description={t("admin.confirm.deleteFaq")}
        confirmLabel={t("admin.actions.delete")}
        danger
      />
    </div>
  );
}

function FaqForm({ item, onSave }: { item: FaqItem; onSave: (item: FaqItem) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState(item);

  return (
    <div className="space-y-4">
      <BilingualField
        label={t("admin.faq.question")}
        valueAr={form.questionAr}
        valueEn={form.questionEn}
        onChangeAr={(v) => setForm({ ...form, questionAr: v })}
        onChangeEn={(v) => setForm({ ...form, questionEn: v })}
      />
      <BilingualField
        label={t("admin.faq.answer")}
        valueAr={form.answerAr}
        valueEn={form.answerEn}
        onChangeAr={(v) => setForm({ ...form, answerAr: v })}
        onChangeEn={(v) => setForm({ ...form, answerEn: v })}
        multiline
      />
      <Button className="w-full" onClick={() => onSave(form)}>
        {t("admin.common.saveChanges")}
      </Button>
    </div>
  );
}
