"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/admin/ui/DataTable";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { CreateAdminDrawer } from "@/components/admin/admins/CreateAdminDrawer";
import type { AdminAccount } from "@/lib/admin/types/admin";

export function AdminsView({ admins }: { admins: AdminAccount[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns: DataTableColumn<AdminAccount>[] = [
    {
      key: "name",
      header: t("admin.table.admin"),
      render: (a) => (
        <div>
          <p className="font-semibold text-primary">{a.fullName}</p>
          <p className="text-xs text-muted">{a.email}</p>
        </div>
      ),
    },
    { key: "role", header: t("admin.table.role"), render: (a) => t(`admin.role.${a.role}`) },
    {
      key: "status",
      header: t("admin.table.status"),
      render: (a) => (
        <StatusBadge label={a.active ? t("admin.status.active") : t("admin.status.suspended")} tone={a.active ? "success" : "danger"} />
      ),
    },
    { key: "lastLogin", header: t("admin.table.lastLogin"), render: (a) => <DateDisplay value={a.lastLoginAt} withTime /> },
    { key: "createdBy", header: t("admin.table.createdBy"), render: (a) => a.createdBy },
    { key: "createdAt", header: t("admin.table.createdAt"), render: (a) => <DateDisplay value={a.createdAt} /> },
  ];

  return (
    <div>
      <AdminPageHeader
        title={t("admin.nav.admins")}
        description={t("admin.admins.subtitle")}
        actions={
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <UserPlus className="size-4" />
            {t("admin.admins.createTitle")}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={admins}
        getRowId={(a) => a.id}
        onRowClick={(a) => router.push(`/admin/admins/${a.id}`)}
      />

      <CreateAdminDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreate={() => router.refresh()}
      />
    </div>
  );
}
