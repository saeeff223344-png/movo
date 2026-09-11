"use client";

import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/lib/i18n/context";
import type { SupportRequest, SupportStatus } from "@/lib/data/support-requests";

const STATUS_STYLES: Record<SupportStatus, string> = {
  new: "bg-brand-500/15 text-brand-400",
  in_progress: "bg-amber-500/15 text-amber-500",
  resolved: "bg-emerald-500/15 text-emerald-500",
};

const STATUS_KEY: Record<SupportStatus, string> = {
  new: "support.statusNew",
  in_progress: "support.statusInProgress",
  resolved: "support.statusResolved",
};

export function RequestsList({ requests }: { requests: SupportRequest[] }) {
  const { t } = useI18n();

  return (
    <div>
      <h2 className="mb-4 text-base font-bold text-primary">
        {t("support.myRequestsTitle")}
      </h2>

      {requests.length === 0 ? (
        <EmptyState icon={Inbox} title={t("support.noRequests")} description="" />
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface px-5 py-4"
            >
              <div>
                <p className="text-sm font-bold text-primary">{req.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {req.id} · {req.createdAt}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[req.status]}`}
              >
                {t(STATUS_KEY[req.status])}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
