"use client";

import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { Bell } from "lucide-react";
import type { AdminNotification } from "@/lib/admin/types/support";

export function NotificationsView({ notifications }: { notifications: AdminNotification[] }) {
  const { t, locale } = useI18n();

  return (
    <div className="max-w-2xl">
      <AdminPageHeader title={t("admin.nav.notifications")} description={t("admin.notifications.subtitle")} />

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title={t("admin.notifications.empty")} description="" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex gap-3 rounded-xl border p-4 ${n.read ? "border-border-subtle bg-surface" : "border-brand-500/30 bg-brand-500/5"}`}
            >
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-border-strong" : "bg-brand-500"}`} />
              <div>
                <p className="text-sm font-bold text-primary">{locale === "ar" ? n.titleAr : n.titleEn}</p>
                <p className="text-sm text-secondary">{locale === "ar" ? n.messageAr : n.messageEn}</p>
                <p className="mt-1 text-xs text-muted">
                  <DateDisplay value={n.createdAt} withTime />
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
