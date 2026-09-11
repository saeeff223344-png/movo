import type { AdminPermission } from "@/lib/admin/config/permissions";

export type AdminRole = "admin" | "super_admin";

export type AdminAccount = {
  id: string;
  fullName: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermission[];
  active: boolean;
  requirePasswordChange: boolean;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  createdBy: string;
};
