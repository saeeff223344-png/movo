"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { PublishStatusBadge } from "@/components/admin/ui/PublishStatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { Toggle } from "@/components/admin/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { BilingualField } from "@/components/admin/ui/BilingualField";
import { Button } from "@/components/ui/Button";
import type { ContentPage } from "@/lib/admin/types/content";
import { updatePageAction } from "@/lib/admin/actions/site-content-actions";

export function PagesView({ pages: initial }: { pages: ContentPage[] }) {
  const { t } = useI18n();
  const [pages, setPages] = useState(initial);
  const [editing, setEditing] = useState<ContentPage | null>(null);

  const columns: DataTableColumn<ContentPage>[] = [
    {
      key: "title",
      header: t("admin.pages.title"),
      render: (p) => (
        <button type="button" onClick={() => setEditing(p)} className="text-start font-semibold text-primary hover:text-brand-400">
          {p.titleAr}
        </button>
      ),
    },
    { key: "slug", header: t("admin.pages.slug"), render: (p) => <code className="text-xs text-muted">/{p.slug}</code> },
    { key: "published", header: t("admin.table.status"), render: (p) => <PublishStatusBadge published={p.published} /> },
    { key: "updated", header: t("admin.table.updatedAt"), render: (p) => <DateDisplay value={p.updatedAt} /> },
    { key: "updatedBy", header: t("admin.table.updatedBy"), render: (p) => p.updatedBy },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.pages")} description={t("admin.pages.subtitle")} />
      <DataTable columns={columns} data={pages} getRowId={(p) => p.id} onRowClick={(p) => setEditing(p)} />

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={t("admin.pages.edit")}>
        {editing && (
          <PageForm
            page={editing}
            onSave={(next) => {
              setPages((prev) => prev.map((p) => (p.id === next.id ? next : p)));
              setEditing(null);
              void updatePageAction(next.id, next);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function PageForm({ page, onSave }: { page: ContentPage; onSave: (p: ContentPage) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState(page);

  return (
    <div className="space-y-4">
      <BilingualField label={t("admin.pages.title")} valueAr={form.titleAr} valueEn={form.titleEn} onChangeAr={(v) => setForm({ ...form, titleAr: v })} onChangeEn={(v) => setForm({ ...form, titleEn: v })} />
      <BilingualField label={t("admin.pages.content")} valueAr={form.contentAr} valueEn={form.contentEn} onChangeAr={(v) => setForm({ ...form, contentAr: v })} onChangeEn={(v) => setForm({ ...form, contentEn: v })} multiline />
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">{t("admin.common.published")}</span>
        <Toggle checked={form.published} onChange={(v) => setForm({ ...form, published: v })} />
      </div>
      <Button className="w-full" onClick={() => onSave(form)}>
        {t("admin.common.saveChanges")}
      </Button>
    </div>
  );
}
