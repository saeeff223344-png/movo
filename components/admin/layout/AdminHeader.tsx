"use client";

import { Menu } from "lucide-react";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { GlobalSearch } from "@/components/admin/layout/GlobalSearch";
import { AdminNotificationsMenu } from "@/components/admin/layout/AdminNotificationsMenu";
import { AdminAccountMenu } from "@/components/admin/layout/AdminAccountMenu";
import { useAdminSidebar } from "@/lib/admin/context/sidebar";
import type { AdminRole } from "@/lib/admin/types/admin";
import type { SearchIndexEntry } from "@/lib/admin/services/search";
import type { AdminNotification } from "@/lib/admin/types/support";

export function AdminHeader({
  admin,
  searchIndex,
  notifications,
}: {
  admin: { fullName: string; email: string; role: AdminRole };
  searchIndex: SearchIndexEntry[];
  notifications: AdminNotification[];
}) {
  const { setMobileOpen } = useAdminSidebar();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border-subtle bg-base/80 px-4 py-3 backdrop-blur-lg sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex size-9 items-center justify-center rounded-xl border border-border-subtle text-primary lg:hidden"
          aria-label="menu"
        >
          <Menu className="size-4" />
        </button>
        <GlobalSearch index={searchIndex} />
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
        <AdminNotificationsMenu notifications={notifications} />
        <AdminAccountMenu admin={admin} />
      </div>
    </header>
  );
}
