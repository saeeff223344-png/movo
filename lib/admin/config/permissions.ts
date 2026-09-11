/**
 * Permission resources map 1:1 to admin sections. Most have read + manage;
 * a few (dashboard, usage, audit) are read-only by design — there is nothing
 * to "manage" on a report screen.
 */
export const PERMISSION_RESOURCES = [
  "dashboard",
  "users",
  "admins",
  "plans",
  "subscriptions",
  "codes",
  "trials",
  "payments",
  "projects",
  "videos",
  "ai_jobs",
  "render_jobs",
  "usage",
  "finance",
  "support",
  "notifications",
  "announcements",
  "homepage",
  "content",
  "examples",
  "faq",
  "developers",
  "pages",
  "legal",
  "navigation",
  "footer",
  "social",
  "seo",
  "localization",
  "assets",
  "settings",
  "feature_flags",
  "audit",
  "system_health",
] as const;

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];
export type PermissionAction = "read" | "manage";
export type AdminPermission = `${PermissionResource}.${PermissionAction}` | "super_admin.all";

export const READ_ONLY_RESOURCES: PermissionResource[] = ["dashboard", "usage", "audit"];

export function resourceHasManage(resource: PermissionResource): boolean {
  return !READ_ONLY_RESOURCES.includes(resource);
}

export type PermissionGroupId =
  | "customers"
  | "billing"
  | "production"
  | "business"
  | "site"
  | "appearance"
  | "system";

export const PERMISSION_GROUPS: {
  id: PermissionGroupId;
  labelKey: string;
  resources: PermissionResource[];
}[] = [
  { id: "customers", labelKey: "admin.permGroup.customers", resources: ["users", "trials"] },
  {
    id: "billing",
    labelKey: "admin.permGroup.billing",
    resources: ["plans", "subscriptions", "codes", "payments", "finance"],
  },
  {
    id: "production",
    labelKey: "admin.permGroup.production",
    resources: ["projects", "videos", "ai_jobs", "render_jobs", "usage"],
  },
  {
    id: "business",
    labelKey: "admin.permGroup.business",
    resources: ["support", "notifications", "announcements"],
  },
  {
    id: "site",
    labelKey: "admin.permGroup.site",
    resources: ["homepage", "content", "examples", "faq", "developers", "pages", "legal"],
  },
  {
    id: "appearance",
    labelKey: "admin.permGroup.appearance",
    resources: ["navigation", "footer", "social", "seo", "assets", "localization"],
  },
  {
    id: "system",
    labelKey: "admin.permGroup.system",
    resources: ["admins", "settings", "feature_flags", "audit", "system_health"],
  },
];

export function buildPermission(resource: PermissionResource, action: PermissionAction): AdminPermission {
  return `${resource}.${action}` as AdminPermission;
}

/** Everything a super_admin implicitly holds — used to render "all" in the matrix. */
export function allPermissions(): AdminPermission[] {
  return PERMISSION_RESOURCES.flatMap((resource) =>
    resourceHasManage(resource)
      ? [buildPermission(resource, "read"), buildPermission(resource, "manage")]
      : [buildPermission(resource, "read")],
  );
}

export function hasPermission(
  granted: AdminPermission[],
  isSuperAdmin: boolean,
  resource: PermissionResource,
  action: PermissionAction = "read",
): boolean {
  if (isSuperAdmin) return true;
  return granted.includes(buildPermission(resource, action));
}
