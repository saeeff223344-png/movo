"use client";

import { Github, Globe, Instagram, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { mockTeam } from "@/lib/data/team";

export function TeamGrid() {
  const { t } = useI18n();

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
      {mockTeam.map((member) => (
        <div
          key={member.id}
          className="rounded-2xl border border-border-subtle bg-surface p-6 text-center"
        >
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-2xl font-extrabold text-white">
            {member.name.charAt(0)}
          </div>
          <p className="mt-4 text-base font-bold text-primary">{member.name}</p>
          <p className="text-sm text-brand-400">{member.role}</p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {member.bio || t("developers.bioPlaceholder")}
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
            {[
              { href: `mailto:${member.email}`, icon: Mail },
              { href: member.instagram, icon: Instagram },
              { href: member.github, icon: Github },
              { href: member.website, icon: Globe },
            ].map((link, i) => (
              <a
                key={i}
                href={link.href}
                className="flex size-8 items-center justify-center rounded-full border border-border-subtle text-muted transition-colors hover:border-border-strong hover:text-primary"
              >
                <link.icon className="size-3.5" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
