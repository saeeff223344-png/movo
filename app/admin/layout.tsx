import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/layout/AdminShell";
import { requireAdmin, getCurrentAdminProfile, getCurrentProfile } from "@/lib/supabase/auth-helpers";
import { getGlobalSearchIndex } from "@/lib/admin/services/search";
import { getNotifications } from "@/lib/admin/services/support";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const [adminProfile, profile, searchIndex, notifications] = await Promise.all([
    getCurrentAdminProfile(),
    getCurrentProfile(),
    getGlobalSearchIndex(),
    getNotifications(),
  ]);

  return (
    <AdminShell
      admin={{
        fullName: profile?.full_name || "Admin",
        email: profile?.email || "",
        role: adminProfile?.role ?? "admin",
      }}
      searchIndex={searchIndex}
      notifications={notifications}
    >
      {children}
    </AdminShell>
  );
}
