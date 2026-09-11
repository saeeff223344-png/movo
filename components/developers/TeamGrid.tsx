"use client";

import { Github, Globe, Instagram, Linkedin, Mail, MessageCircle, Users, X as XIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PublicDeveloper } from "@/lib/supabase/developers";

export function TeamGrid({ developers }: { developers: PublicDeveloper[] }) {
  const { t, locale } = useI18n();

  if (developers.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <EmptyState icon={Users} title={t("developers.empty")} description="" />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
      {developers.map((member) => {
        const name = locale === "ar" ? member.nameAr : member.nameEn;
        const role = locale === "ar" ? member.jobTitleAr : member.jobTitleEn;
        const bio = (locale === "ar" ? member.bioAr : member.bioEn) || t("developers.bioPlaceholder");

        const links = [
          member.email ? { href: `mailto:${member.email}`, icon: Mail } : null,
          member.whatsapp ? { href: `https://wa.me/${member.whatsapp.replace(/[^0-9]/g, "")}`, icon: MessageCircle } : null,
          member.instagram ? { href: member.instagram, icon: Instagram } : null,
          member.github ? { href: member.github, icon: Github } : null,
          member.linkedin ? { href: member.linkedin, icon: Linkedin } : null,
          member.website ? { href: member.website, icon: Globe } : null,
          member.x ? { href: member.x, icon: XIcon } : null,
        ].filter((l): l is NonNullable<typeof l> => l !== null);

        return (
          <div
            key={member.id}
            className="rounded-2xl border border-border-subtle bg-surface p-6 text-center"
          >
            {member.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external/admin-uploaded URL, no static import path
              <img
                src={member.photoUrl}
                alt={name}
                className="mx-auto size-20 rounded-full object-cover"
              />
            ) : (
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-2xl font-extrabold text-white">
                {name.charAt(0)}
              </div>
            )}
            <p className="mt-4 text-base font-bold text-primary">{name}</p>
            <p className="text-sm text-brand-400">{role}</p>
            <p className="mt-3 text-xs leading-relaxed text-muted">{bio}</p>

            {links.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex size-8 items-center justify-center rounded-full border border-border-subtle text-muted transition-colors hover:border-border-strong hover:text-primary"
                  >
                    <link.icon className="size-3.5" />
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
