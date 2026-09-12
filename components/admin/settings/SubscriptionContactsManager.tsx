"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/admin/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { BilingualField } from "@/components/admin/ui/BilingualField";
import { FieldLabel, TextInput } from "@/components/admin/ui/FormField";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import type { SubscriptionContactPerson } from "@/lib/admin/types/system";
import {
  createSubscriptionContactAction,
  updateSubscriptionContactAction,
  deleteSubscriptionContactAction,
} from "@/lib/admin/actions/system-actions";

/**
 * CRUD list for public.subscription_contacts (014_subscription_contacts.sql)
 * — named WhatsApp contacts for subscription activation, shown on
 * /subscription once this list has active rows (see HowToGetCode.tsx).
 * Every change (toggle, reorder, add, edit, delete) persists immediately via
 * its own server action, same as FaqView — this is a real table, not part
 * of the batched system_settings jsonb save above it.
 */
export function SubscriptionContactsManager({ contacts: initial }: { contacts: SubscriptionContactPerson[] }) {
  const { t, locale } = useI18n();
  const [contacts, setContacts] = useState(initial);
  const [editing, setEditing] = useState<SubscriptionContactPerson | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<SubscriptionContactPerson | null>(null);

  const draft: SubscriptionContactPerson = editing ?? {
    id: "",
    nameAr: "",
    nameEn: "",
    whatsapp: "",
    active: true,
    displayOrder: contacts.length + 1,
  };

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= contacts.length) return;
    const next = [...contacts];
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = next.map((c, i) => ({ ...c, displayOrder: i + 1 }));
    setContacts(reordered);
    void updateSubscriptionContactAction(reordered[index].id, { displayOrder: reordered[index].displayOrder });
    void updateSubscriptionContactAction(reordered[target].id, { displayOrder: reordered[target].displayOrder });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {contacts.length === 0 ? t("admin.contact.noContacts") : null}
        </p>
        <Button size="sm" variant="outline" onClick={() => setCreating(true)} className="ms-auto">
          <Plus className="size-4" />
          {t("admin.contact.addContact")}
        </Button>
      </div>

      {contacts.length > 0 && (
        <div className="mt-3 space-y-2">
          {contacts.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-base p-3">
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="text-muted hover:text-primary disabled:opacity-30"
                  aria-label="move up"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={i === contacts.length - 1}
                  onClick={() => move(i, 1)}
                  className="text-muted hover:text-primary disabled:opacity-30"
                  aria-label="move down"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>

              <button type="button" onClick={() => setEditing(c)} className="flex-1 text-start">
                <p className="text-sm font-semibold text-primary hover:text-brand-400">
                  {locale === "ar" ? c.nameAr : c.nameEn}
                </p>
                <p className="text-xs text-muted" dir="ltr">
                  {c.whatsapp}
                </p>
              </button>

              <Toggle
                checked={c.active}
                onChange={(v) => {
                  setContacts((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: v } : x)));
                  void updateSubscriptionContactAction(c.id, { active: v });
                }}
              />

              <button
                type="button"
                onClick={() => setDeleting(c)}
                className="text-muted hover:text-red-400"
                aria-label="delete"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={editing !== null || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        title={editing ? t("admin.contact.editContact") : t("admin.contact.addContact")}
      >
        <ContactForm
          contact={draft}
          onSave={async (next) => {
            setEditing(null);
            setCreating(false);
            if (editing) {
              setContacts((prev) => prev.map((x) => (x.id === next.id ? next : x)));
              await updateSubscriptionContactAction(next.id, next);
            } else {
              const result = await createSubscriptionContactAction(next);
              if (result.ok) setContacts((prev) => [...prev, { ...next, id: result.id }]);
            }
          }}
        />
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          setContacts((prev) => prev.filter((x) => x.id !== deleting.id));
          void deleteSubscriptionContactAction(deleting.id);
        }}
        title={t("admin.actions.delete")}
        description={t("admin.confirm.deleteSubscriptionContact")}
        confirmLabel={t("admin.actions.delete")}
        danger
      />
    </div>
  );
}

function ContactForm({
  contact,
  onSave,
}: {
  contact: SubscriptionContactPerson;
  onSave: (contact: SubscriptionContactPerson) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState(contact);

  return (
    <div className="space-y-4">
      <BilingualField
        label={t("admin.contact.contactName")}
        valueAr={form.nameAr}
        valueEn={form.nameEn}
        onChangeAr={(v) => setForm({ ...form, nameAr: v })}
        onChangeEn={(v) => setForm({ ...form, nameEn: v })}
      />
      <FieldLabel label={t("admin.contact.whatsappNumber")}>
        <TextInput value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} dir="ltr" />
      </FieldLabel>
      <Button className="w-full" onClick={() => onSave(form)}>
        {t("admin.common.saveChanges")}
      </Button>
    </div>
  );
}
