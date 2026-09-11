"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { useI18n } from "@/lib/i18n/context";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/#how-it-works", label: t("nav.howItWorks") },
    { href: "/templates", label: t("nav.examples") },
    { href: "/about", label: t("nav.about") },
    { href: "/support", label: t("nav.support") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-base/80 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Logo />

        <div className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-secondary transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <span className="mx-1 h-6 w-px bg-border-subtle" />
          <Button href="/login" variant="ghost" size="sm">
            {t("nav.login")}
          </Button>
          <Button href="/signup" size="sm">
            {t("nav.signup")}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex size-10 items-center justify-center rounded-lg border border-border-subtle text-primary lg:hidden"
          aria-label="menu"
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border-subtle bg-base px-5 pb-6 pt-2 lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-secondary hover:bg-surface-hover hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <LanguageSwitcher className="flex-1 justify-center" />
            <ThemeSwitcher />
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <Button href="/login" variant="outline">
              {t("nav.login")}
            </Button>
            <Button href="/signup">{t("nav.signup")}</Button>
          </div>
        </div>
      )}
    </header>
  );
}
