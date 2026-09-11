"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, LogOut, Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import type { AdminRole } from "@/lib/admin/types/admin";

export function AdminAccountMenu({ admin }: { admin: { fullName: string; email: string; role: AdminRole } }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface py-1 pe-2.5 ps-1.5"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-xs font-bold text-white">
          {admin.fullName.charAt(0)}
        </span>
        <span className="hidden text-sm font-semibold text-primary sm:inline">{admin.fullName}</span>
        <ChevronDown className="size-3.5 text-muted" />
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border-subtle bg-elevated shadow-2xl">
          <div className="border-b border-border-subtle px-4 py-3">
            <p className="truncate text-sm font-bold text-primary">{admin.fullName}</p>
            <p className="truncate text-xs text-muted">{admin.email}</p>
            <span className="mt-1.5 inline-block rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-brand-400">
              {t(`admin.role.${admin.role}`)}
            </span>
          </div>
          <div className="p-1.5">
            <Link
              href="/admin/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary hover:bg-surface-hover hover:text-primary"
            >
              <Settings className="size-4" />
              {t("admin.nav.settings")}
            </Link>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary hover:bg-surface-hover hover:text-primary"
            >
              <ExternalLink className="size-4" />
              {t("admin.common.viewSite")}
            </Link>
          </div>
          <div className="border-t border-border-subtle p-1.5">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="size-4" />
              {t("nav.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
