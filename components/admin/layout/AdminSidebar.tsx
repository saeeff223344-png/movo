"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/lib/i18n/context";
import { useAdminSidebar } from "@/lib/admin/context/sidebar";
import { ADMIN_NAV_GROUPS } from "@/lib/admin/config/navigation";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const { collapsed, toggleCollapsed } = useAdminSidebar();
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-4">
        {!collapsed && <Logo href="/admin" />}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-primary lg:flex"
          aria-label="toggle sidebar"
        >
          {collapsed ? <ChevronsLeft className="size-4" /> : <ChevronsRight className="size-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.id}>
            {!collapsed && (
              <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                {t(group.labelKey)}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? t(item.labelKey) : undefined}
                    className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-brand-500/10 text-brand-400"
                        : "text-secondary hover:bg-surface-hover hover:text-primary"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <item.icon className="size-4 shrink-0" strokeWidth={2} />
                    {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function AdminSidebar() {
  const { collapsed, mobileOpen, setMobileOpen } = useAdminSidebar();

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-e border-border-subtle bg-elevated transition-all duration-200 lg:block ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <button
            type="button"
            aria-label="close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-elevated shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="close"
              className="absolute end-3 top-3 flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-hover"
            >
              <X className="size-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
