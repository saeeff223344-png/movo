import type { ReactNode } from "react";
import { AdminSidebarProvider } from "@/lib/admin/context/sidebar";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminHeader } from "@/components/admin/layout/AdminHeader";
import type { AdminRole } from "@/lib/admin/types/admin";
import type { SearchIndexEntry } from "@/lib/admin/services/search";
import type { AdminNotification } from "@/lib/admin/types/support";

export function AdminShell({
  children,
  admin,
  searchIndex,
  notifications,
}: {
  children: ReactNode;
  admin: { fullName: string; email: string; role: AdminRole };
  searchIndex: SearchIndexEntry[];
  notifications: AdminNotification[];
}) {
  return (
    <AdminSidebarProvider>
      <div className="flex min-h-screen bg-base">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <AdminHeader admin={admin} searchIndex={searchIndex} notifications={notifications} />
          <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        </div>
      </div>
    </AdminSidebarProvider>
  );
}
