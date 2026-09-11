"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Info,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Sparkles,
  User as UserIcon,
  Users,
  Wallet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";

export function AccountMenu({ user }: { user: { fullName: string; email: string } }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  const items = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/create", label: t("nav.create"), icon: Sparkles },
    { href: "/subscription", label: t("nav.subscription"), icon: Wallet },
    { href: "/settings", label: t("nav.settings"), icon: UserIcon },
    { href: "/support", label: t("nav.help"), icon: LifeBuoy },
    { href: "/about", label: t("nav.about"), icon: Info },
    { href: "/developers", label: t("nav.developers"), icon: Users },
  ];

  const initial = user.fullName.trim().charAt(0) || "M";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface py-1 pe-3 ps-1.5 transition-colors hover:border-border-strong"
        aria-expanded={open}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-xs font-bold text-white">
          {initial}
        </span>
        <span className="hidden text-sm font-semibold text-primary sm:inline">
          {user.fullName}
        </span>
        <ChevronDown className="size-4 text-muted" />
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border-subtle bg-elevated shadow-2xl shadow-black/20">
          <div className="border-b border-border-subtle px-4 py-3">
            <p className="truncate text-sm font-bold text-primary">
              {user.fullName}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="p-1.5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
              >
                <item.icon className="size-4" strokeWidth={2} />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-border-subtle p-1.5">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="size-4" strokeWidth={2} />
              {t("nav.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
