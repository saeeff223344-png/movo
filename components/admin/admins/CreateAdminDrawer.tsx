"use client";

import { useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminDrawer } from "@/components/admin/ui/AdminDrawer";
import { FieldLabel, TextInput, SelectField } from "@/components/admin/ui/FormField";
import { PermissionMatrix } from "@/components/admin/ui/PermissionMatrix";
import { Toggle } from "@/components/admin/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthError";
import { createAdmin } from "@/lib/admin/actions/create-admin";
import type { AdminRole } from "@/lib/admin/types/admin";
import { allPermissions, type AdminPermission } from "@/lib/admin/config/permissions";

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function CreateAdminDrawer({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [requireChange, setRequireChange] = useState(true);
  const [tempPassword, setTempPassword] = useState(generateTempPassword());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    setSubmitting(true);
    setError(null);

    const result = await createAdmin({
      fullName: fullName.trim(),
      email: email.trim(),
      temporaryPassword: tempPassword,
      role,
      permissions: role === "super_admin" ? allPermissions() : permissions,
      requirePasswordChange: requireChange,
    });

    setSubmitting(false);

    if (!result.ok) {
      const knownErrors: Record<string, string> = {
        PERMISSION_DENIED: t("admin.admins.createErrorPermission"),
        INVALID_INPUT: t("admin.admins.createErrorInvalid"),
      };
      setError(knownErrors[result.error] ?? t("admin.admins.createErrorGeneric"));
      return;
    }

    onCreate();
    setFullName("");
    setEmail("");
    setRole("admin");
    setPermissions([]);
    setTempPassword(generateTempPassword());
    onClose();
  }

  return (
    <AdminDrawer open={open} onClose={onClose} title={t("admin.admins.createTitle")}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthError message={error} />
        <FieldLabel label={t("admin.admins.fullName")}>
          <TextInput value={fullName} onChange={setFullName} placeholder={t("admin.admins.fullNamePlaceholder")} />
        </FieldLabel>
        <FieldLabel label={t("admin.admins.email")}>
          <TextInput type="email" value={email} onChange={setEmail} placeholder="name@movo.app" dir="ltr" />
        </FieldLabel>
        <FieldLabel label={t("admin.admins.role")}>
          <SelectField
            value={role}
            onChange={setRole}
            options={[
              { value: "admin", label: t("admin.role.admin") },
              { value: "super_admin", label: t("admin.role.super_admin") },
            ]}
          />
        </FieldLabel>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-secondary">{t("admin.admins.tempPassword")}</p>
          <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-base px-3.5 py-2.5">
            <code dir="ltr" className="flex-1 text-sm font-semibold text-primary">
              {tempPassword}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(tempPassword)}
              className="text-muted hover:text-primary"
              aria-label="copy"
            >
              <Copy className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setTempPassword(generateTempPassword())}
              className="text-muted hover:text-primary"
              aria-label="regenerate"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">{t("admin.admins.tempPasswordHint")}</p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface px-4 py-3">
          <span className="text-sm font-semibold text-primary">{t("admin.admins.requireChange")}</span>
          <Toggle checked={requireChange} onChange={setRequireChange} label={t("admin.admins.requireChange")} />
        </div>

        {role === "admin" && (
          <div>
            <p className="mb-2 text-xs font-semibold text-secondary">{t("admin.admins.permissions")}</p>
            <PermissionMatrix permissions={permissions} onChange={setPermissions} />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t("common.loading") : t("admin.admins.createSubmit")}
        </Button>
      </form>
    </AdminDrawer>
  );
}
