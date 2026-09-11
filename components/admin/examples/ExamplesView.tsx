"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Toggle } from "@/components/admin/ui/Toggle";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { BilingualField } from "@/components/admin/ui/BilingualField";
import { FieldLabel, TextInput } from "@/components/admin/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Star } from "lucide-react";
import type { ExampleVideo } from "@/lib/admin/types/content";
import { updateExampleAction } from "@/lib/admin/actions/site-content-actions";

export function ExamplesView({ examples: initial }: { examples: ExampleVideo[] }) {
  const { t } = useI18n();
  const [examples, setExamples] = useState(initial);
  const [editing, setEditing] = useState<ExampleVideo | null>(null);

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.examples")} description={t("admin.examples.subtitle")} />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {examples.map((ex) => (
          <div key={ex.id} className="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
            <button
              type="button"
              onClick={() => setEditing(ex)}
              className={`flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br ${ex.thumbnailGradient} p-4 text-center text-sm font-bold text-white`}
            >
              {ex.titleAr}
            </button>
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                {ex.featured && <Star className="size-3.5 text-accent-500" />}
                <StatusBadge label={ex.category} tone="neutral" />
              </div>
              <Toggle
                checked={ex.active}
                onChange={(v) => {
                  setExamples((prev) => prev.map((x) => (x.id === ex.id ? { ...x, active: v } : x)));
                  void updateExampleAction(ex.id, { active: v });
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={t("admin.examples.edit")}>
        {editing && (
          <ExampleForm
            example={editing}
            onSave={(next) => {
              setExamples((prev) => prev.map((x) => (x.id === next.id ? next : x)));
              setEditing(null);
              void updateExampleAction(next.id, next);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function ExampleForm({ example, onSave }: { example: ExampleVideo; onSave: (e: ExampleVideo) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState(example);

  return (
    <div className="space-y-4">
      <BilingualField
        label={t("admin.examples.title")}
        valueAr={form.titleAr}
        valueEn={form.titleEn}
        onChangeAr={(v) => setForm({ ...form, titleAr: v })}
        onChangeEn={(v) => setForm({ ...form, titleEn: v })}
      />
      <BilingualField
        label={t("admin.examples.description")}
        valueAr={form.descriptionAr}
        valueEn={form.descriptionEn}
        onChangeAr={(v) => setForm({ ...form, descriptionAr: v })}
        onChangeEn={(v) => setForm({ ...form, descriptionEn: v })}
        multiline
      />
      <FieldLabel label={t("admin.examples.promptExample")}>
        <TextInput value={form.promptExample} onChange={(v) => setForm({ ...form, promptExample: v })} />
      </FieldLabel>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">{t("admin.examples.featured")}</span>
        <Toggle checked={form.featured} onChange={(v) => setForm({ ...form, featured: v })} />
      </div>
      <Button className="w-full" onClick={() => onSave(form)}>
        {t("admin.common.saveChanges")}
      </Button>
    </div>
  );
}
