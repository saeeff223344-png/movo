"use client";

import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import type { SystemHealthServiceEntry, SystemHealthStatus } from "@/lib/admin/types/system";

const TONE: Record<SystemHealthStatus, "success" | "warning" | "danger" | "neutral"> = {
  operational: "success",
  degraded: "warning",
  down: "danger",
  not_configured: "neutral",
};

export function SystemHealthView({ services }: { services: SystemHealthServiceEntry[] }) {
  const { t, locale } = useI18n();

  return (
    <div className="max-w-3xl">
      <AdminPageHeader title={t("admin.nav.systemHealth")} description={t("admin.systemHealth.subtitle")} />

      <div className="space-y-2">
        {services.map((service) => (
          <div key={service.id} className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4">
            <div>
              <p className="font-semibold text-primary">{locale === "ar" ? service.nameAr : service.nameEn}</p>
              {service.note && <p className="text-xs text-muted">{service.note}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                <DateDisplay value={service.lastCheckedAt} withTime />
              </span>
              <StatusBadge label={t(`admin.healthStatus.${service.status}`)} tone={TONE[service.status]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
