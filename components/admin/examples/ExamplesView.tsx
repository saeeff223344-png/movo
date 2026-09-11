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
import { Star, Upload } from "lucide-react";
import type { ExampleVideo } from "@/lib/admin/types/content";
import { updateExampleAction, uploadExampleThumbnailAction } from "@/lib/admin/actions/site-content-actions";
import { SelectField } from "@/components/admin/ui/FormField";
import { AuthError } from "@/components/auth/AuthError";

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
              className={`relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden bg-gradient-to-br ${ex.thumbnailGradient} p-4 text-center text-sm font-bold text-white`}
            >
              {ex.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- storage-uploaded URL
                <img src={ex.thumbnailUrl} alt={ex.titleAr} className="absolute inset-0 size-full object-cover" />
              ) : (
                ex.titleAr
              )}
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    const data = new FormData();
    data.set("file", file);
    const result = await uploadExampleThumbnailAction(form.id, data);
    setUploading(false);

    if (!result.ok) {
      setUploadError(t("admin.examples.uploadError"));
      return;
    }
    setForm((prev) => ({ ...prev, thumbnailUrl: result.url }));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-secondary">{t("admin.examples.thumbnail")}</p>
        <div className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${form.thumbnailGradient}`}>
          {form.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- storage-uploaded URL
            <img src={form.thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />
          )}
          <label className="relative z-10 flex cursor-pointer items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm hover:bg-black/60">
            <Upload className="size-3.5" />
            {uploading ? t("common.loading") : t("admin.examples.uploadThumbnail")}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
          </label>
        </div>
        {uploadError && <div className="mt-2"><AuthError message={uploadError} /></div>}
      </div>

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
      <FieldLabel label={t("admin.examples.aspectRatio")}>
        <SelectField
          value={form.aspectRatio}
          onChange={(v: ExampleVideo["aspectRatio"]) => setForm({ ...form, aspectRatio: v })}
          options={[
            { value: "9:16", label: "9:16" },
            { value: "16:9", label: "16:9" },
            { value: "1:1", label: "1:1" },
          ]}
        />
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
