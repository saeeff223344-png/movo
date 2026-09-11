"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SearchBox } from "@/components/admin/ui/SearchBox";
import { ActivityTimeline } from "@/components/admin/ui/ActivityTimeline";
import { formatDateTime } from "@/lib/admin/utils/format";
import type { AuditLogEntry } from "@/lib/admin/types/system";

export function ActivityView({ entries }: { entries: AuditLogEntry[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          query.trim().length === 0 ||
          e.action.toLowerCase().includes(query.toLowerCase()) ||
          e.admin.toLowerCase().includes(query.toLowerCase()),
      ),
    [entries, query],
  );

  const timelineEntries = filtered.map((e) => ({
    id: e.id,
    title: `${e.admin} — ${e.action}`,
    description: [e.targetUser, e.oldValue && e.newValue ? `${e.oldValue} → ${e.newValue}` : e.newValue]
      .filter(Boolean)
      .join(" · "),
    timestamp: formatDateTime(e.createdAt),
  }));

  return (
    <div className="max-w-3xl">
      <AdminPageHeader title={t("admin.nav.activity")} description={t("admin.activity.subtitle")} />
      <div className="mb-6">
        <SearchBox value={query} onChange={setQuery} placeholder={t("admin.common.search")} className="w-full sm:w-72" />
      </div>
      <div className="rounded-2xl border border-border-subtle bg-surface p-6">
        <ActivityTimeline entries={timelineEntries} />
      </div>
    </div>
  );
}
