"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, KeyRound, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { DetailField, DetailGrid } from "@/components/admin/ui/DetailGrid";
import { FieldLabel, SelectField, TextInput } from "@/components/admin/ui/FormField";
import { PermissionMatrix } from "@/components/admin/ui/PermissionMatrix";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { AuthError } from "@/components/auth/AuthError";
import type { AdminAccount, AdminRole } from "@/lib/admin/types/admin";
import { allPermissions, type AdminPermission } from "@/lib/admin/config/permissions";
import {
  updateAdminAction,
  suspendAdminAction,
  reactivateAdminAction,
  resetAdminPasswordAction,
} from "@/lib/admin/actions/admin-actions";

export function AdminDetailView({
  admin,
  currentAdminId,
}: {
  admin: AdminAccount;
  currentAdminId: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [fullName, setFullName] = useState(admin.fullName);
  const [role, setRole] = useState<AdminRole>(admin.role);
  const [permissions, setPermissions] = useState<AdminPermission[]>(admin.permissions);
  const [active, setActive] = useState(admin.active);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"suspend" | "reactivate" | "resetPassword" | null>(null);

  const isSelf = admin.id === currentAdminId;

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateAdminAction(admin.id, { fullName, role, permissions });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-3xl">
      <AdminPageHeader title={admin.fullName} description={admin.email} backHref="/admin/admins" />

      <DetailGrid>
        <DetailField label={t("admin.table.lastLogin")} value={<DateDisplay value={admin.lastLoginAt} withTime />} />
        <DetailField label={t("admin.table.lastActivity")} value={<DateDisplay value={admin.lastActivityAt} withTime />} />
        <DetailField label={t("admin.table.createdBy")} value={admin.createdBy} />
        <DetailField label={t("admin.table.createdAt")} value={<DateDisplay value={admin.createdAt} />} />
        <DetailField
          label={t("admin.table.status")}
          value={<StatusBadge label={active ? t("admin.status.active") : t("admin.status.suspended")} tone={active ? "success" : "danger"} />}
        />
        <DetailField
          label={t("admin.admins.requireChange")}
          value={admin.requirePasswordChange ? t("admin.common.yes") : t("admin.common.no")}
        />
      </DetailGrid>

      <div className="mt-6 space-y-5 rounded-2xl border border-border-subtle bg-surface p-6">
        <AuthError message={error} />
        <FieldLabel label={t("admin.admins.fullName")}>
          <TextInput value={fullName} onChange={setFullName} />
        </FieldLabel>
        <FieldLabel label={t("admin.admins.email")}>
          <TextInput type="email" value={admin.email} onChange={() => {}} dir="ltr" disabled />
        </FieldLabel>
        <FieldLabel label={t("admin.admins.role")}>
          <SelectField
            value={role}
            onChange={(v) => {
              setRole(v);
              if (v === "super_admin") setPermissions(allPermissions());
            }}
            options={[
              { value: "admin", label: t("admin.role.admin") },
              { value: "super_admin", label: t("admin.role.super_admin") },
            ]}
          />
        </FieldLabel>

        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="size-4" />
          {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
        </Button>
      </div>

      {role === "admin" && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-bold text-primary">{t("admin.admins.permissions")}</p>
          <PermissionMatrix permissions={permissions} onChange={setPermissions} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {active ? (
          <Button variant="danger" size="sm" disabled={isSelf} onClick={() => setConfirmAction("suspend")}>
            <Ban className="size-4" />
            {t("admin.actions.suspend")}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setConfirmAction("reactivate")}>
            <CheckCircle2 className="size-4" />
            {t("admin.actions.reactivate")}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setConfirmAction("resetPassword")}>
          <KeyRound className="size-4" />
          {t("admin.actions.resetPassword")}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmAction === "suspend"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          setActive(false);
          void suspendAdminAction(admin.id).then((r) => {
            if (!r.ok) setActive(true);
          });
        }}
        title={t("admin.actions.suspend")}
        description={t("admin.confirm.suspendAdmin")}
        confirmLabel={t("admin.actions.suspend")}
        danger
      />
      <ConfirmDialog
        open={confirmAction === "reactivate"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          setActive(true);
          void reactivateAdminAction(admin.id).then((r) => {
            if (!r.ok) setActive(false);
          });
        }}
        title={t("admin.actions.reactivate")}
        description={t("admin.confirm.reactivateAdmin")}
        confirmLabel={t("admin.actions.reactivate")}
      />
      <ConfirmDialog
        open={confirmAction === "resetPassword"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => void resetAdminPasswordAction(admin.id)}
        title={t("admin.actions.resetPassword")}
        description={t("admin.confirm.resetPassword")}
        confirmLabel={t("admin.actions.resetPassword")}
      />
    </div>
  );
}
