"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import {
  PERMISSION_GROUPS,
  resourceHasManage,
  buildPermission,
  allPermissions,
  type AdminPermission,
} from "@/lib/admin/config/permissions";

export function PermissionMatrix({
  permissions,
  onChange,
  disabled = false,
}: {
  permissions: AdminPermission[];
  onChange: (permissions: AdminPermission[]) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  function toggle(permission: AdminPermission) {
    if (disabled) return;
    onChange(
      permissions.includes(permission)
        ? permissions.filter((p) => p !== permission)
        : [...permissions, permission],
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle">
      <div className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3">
        <p className="text-xs font-bold text-muted">{t("admin.permissions.matrixTitle")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(allPermissions())}
            className="text-xs font-bold text-brand-400 hover:text-brand-300 disabled:opacity-40"
          >
            {t("admin.permissions.selectAll")}
          </button>
          <span className="text-border-strong">·</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange([])}
            className="text-xs font-bold text-secondary hover:text-primary disabled:opacity-40"
          >
            {t("admin.permissions.clearAll")}
          </button>
        </div>
      </div>

      <div className="divide-y divide-border-subtle">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.id} className="bg-elevated">
            <p className="bg-surface px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">
              {t(group.labelKey)}
            </p>
            {group.resources.map((resource) => {
              const readPerm = buildPermission(resource, "read");
              const managePerm = resourceHasManage(resource) ? buildPermission(resource, "manage") : null;

              return (
                <div
                  key={resource}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                >
                  <span className="text-secondary">{t(`admin.resource.${resource}`)}</span>
                  <div className="flex items-center gap-4">
                    <PermissionCheckbox
                      checked={permissions.includes(readPerm)}
                      onToggle={() => toggle(readPerm)}
                      label={t("admin.permissions.view")}
                      disabled={disabled}
                    />
                    {managePerm ? (
                      <PermissionCheckbox
                        checked={permissions.includes(managePerm)}
                        onToggle={() => toggle(managePerm)}
                        label={t("admin.permissions.manage")}
                        disabled={disabled}
                      />
                    ) : (
                      <span className="w-[74px]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function PermissionCheckbox({
  checked,
  onToggle,
  label,
  disabled,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="flex w-[74px] items-center gap-1.5 text-xs font-medium text-secondary disabled:opacity-60"
    >
      <span
        className={`flex size-4 items-center justify-center rounded border transition-colors ${
          checked ? "border-brand-500 bg-brand-500 text-white" : "border-border-strong"
        }`}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}
