"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { useI18n } from "@/lib/i18n/context";

export function AppHeader({ user }: { user: { fullName: string; email: string } }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/create", label: t("nav.create") },
    { href: "/subscription", label: t("nav.subscription") },
    { href: "/settings", label: t("nav.settings") },
    { href: "/templates", label: t("nav.examples") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-base/80 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-8">
          <Logo href="/dashboard" />
          <div className="hidden items-center gap-6 xl:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-secondary transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button href="/create" size="sm">
            {t("nav.create")}
          </Button>
          <LanguageSwitcher />
          <ThemeSwitcher />
          <AccountMenu user={user} />
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <AccountMenu user={user} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex size-10 items-center justify-center rounded-lg border border-border-subtle text-primary"
            aria-label="menu"
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border-subtle bg-base px-5 pb-6 pt-2 lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-secondary hover:bg-surface-hover hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <LanguageSwitcher className="flex-1 justify-center" />
            <ThemeSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
