"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { PublishStatusBadge } from "@/components/admin/ui/PublishStatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { Modal } from "@/components/ui/Modal";
import { BilingualField } from "@/components/admin/ui/BilingualField";
import { Toggle } from "@/components/admin/ui/Toggle";
import { Button } from "@/components/ui/Button";
import type { LegalDocument } from "@/lib/admin/types/content";
import { updateLegalDocumentAction } from "@/lib/admin/actions/site-content-actions";

export function LegalView({ documents: initial }: { documents: LegalDocument[] }) {
  const { t } = useI18n();
  const [documents, setDocuments] = useState(initial);
  const [editing, setEditing] = useState<LegalDocument | null>(null);

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.legal")} description={t("admin.legal.subtitle")} />

      <div className="space-y-3">
        {documents.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => setEditing(doc)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4 text-start transition-colors hover:border-border-strong"
          >
            <div>
              <p className="font-semibold text-primary">{doc.titleAr}</p>
              <p className="text-xs text-muted">
                {t("admin.legal.lastUpdated")}: <DateDisplay value={doc.lastUpdated} />
              </p>
            </div>
            <PublishStatusBadge published={doc.published} />
          </button>
        ))}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing?.titleAr ?? ""}>
        {editing && (
          <LegalForm
            doc={editing}
            onSave={(next) => {
              setDocuments((prev) => prev.map((d) => (d.id === next.id ? next : d)));
              setEditing(null);
              void updateLegalDocumentAction(next.id, next);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function LegalForm({ doc, onSave }: { doc: LegalDocument; onSave: (d: LegalDocument) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState(doc);

  return (
    <div className="space-y-4">
      <BilingualField
        label={t("admin.legal.content")}
        valueAr={form.contentAr}
        valueEn={form.contentEn}
        onChangeAr={(v) => setForm({ ...form, contentAr: v })}
        onChangeEn={(v) => setForm({ ...form, contentEn: v })}
        multiline
      />
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">{t("admin.common.published")}</span>
        <Toggle checked={form.published} onChange={(v) => setForm({ ...form, published: v })} />
      </div>
      <Button className="w-full" onClick={() => onSave({ ...form, lastUpdated: new Date().toISOString() })}>
        {t("admin.common.saveChanges")}
      </Button>
    </div>
  );
}
