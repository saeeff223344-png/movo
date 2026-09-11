"use client";

import { Instagram, Twitter, Youtube } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/lib/i18n/context";

export function Footer() {
  const { t } = useI18n();

  const columns = [
    {
      title: t("footer.platform"),
      links: [
        { label: t("nav.examples"), href: "/templates" },
        { label: t("nav.howItWorks"), href: "/#how-it-works" },
        { label: t("nav.about"), href: "/about" },
        { label: t("nav.support"), href: "/support" },
      ],
    },
    {
      title: t("footer.accountCol"),
      links: [
        { label: t("nav.login"), href: "/login" },
        { label: t("nav.signup"), href: "/signup" },
        { label: t("nav.dashboard"), href: "/dashboard" },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { label: t("nav.about"), href: "/about" },
        { label: t("nav.developers"), href: "/developers" },
        { label: t("nav.support"), href: "/support" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border-subtle bg-base">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {t("footer.description")}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[Instagram, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex size-9 items-center justify-center rounded-full border border-border-subtle text-muted transition-colors hover:border-border-strong hover:text-primary"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-bold text-primary">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border-subtle pt-8 text-sm text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} MOVO. {t("footer.rights")}.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-primary">
              {t("footer.privacy")}
            </a>
            <a href="#" className="hover:text-primary">
              {t("footer.terms")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
