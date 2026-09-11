"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import type { AdminNotification } from "@/lib/admin/types/support";

export function AdminNotificationsMenu({ notifications }: { notifications: AdminNotification[] }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-xl border border-border-subtle text-muted transition-colors hover:text-primary"
        aria-label={t("admin.nav.notifications")}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border-subtle bg-elevated shadow-2xl">
          <div className="border-b border-border-subtle px-4 py-3">
            <p className="text-sm font-bold text-primary">{t("admin.nav.notifications")}</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="flex gap-3 border-b border-border-subtle px-4 py-3 last:border-0">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand-500"}`} />
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {locale === "ar" ? n.titleAr : n.titleEn}
                  </p>
                  <p className="text-xs text-muted">{locale === "ar" ? n.messageAr : n.messageEn}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    <DateDisplay value={n.createdAt} withTime />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
