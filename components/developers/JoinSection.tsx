"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { SupportContact } from "@/lib/supabase/contact";
import { buildWhatsAppLink } from "@/lib/utils/whatsapp";

/**
 * Real WhatsApp/phone/email — read from system_settings.support_contact
 * (see lib/supabase/contact.ts), same row /admin/settings → Contact edits.
 * Deliberately not a link to /support: this is "get in touch with us"
 * (e.g. about joining the team), not a technical support ticket — support
 * stays a fully separate system.
 */
export function JoinSection({ contact }: { contact: SupportContact | null }) {
  const { t } = useI18n();

  const channels = contact
    ? [
        contact.whatsapp.enabled && contact.whatsapp.value
          ? { key: "whatsapp", icon: MessageCircle, label: t("subscription.contactWhatsapp"), href: buildWhatsAppLink(contact.whatsapp.value) }
          : null,
        contact.phone.enabled && contact.phone.value
          ? { key: "phone", icon: Phone, label: t("subscription.contactPhone"), href: `tel:${contact.phone.value.replace(/\s/g, "")}` }
          : null,
        contact.email.enabled && contact.email.value
          ? { key: "email", icon: Mail, label: t("subscription.contactEmail"), href: `mailto:${contact.email.value}` }
          : null,
      ].filter((c): c is NonNullable<typeof c> => c !== null)
    : [];

  return (
    <div className="mx-auto max-w-xl px-5 text-center sm:px-8">
      <div className="rounded-2xl border border-border-subtle bg-surface p-8">
        <h2 className="text-lg font-bold text-primary">{t("developers.joinTitle")}</h2>
        <p className="mt-2 text-sm text-muted">{t("developers.joinDesc")}</p>

        {channels.length > 0 ? (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {channels.map((c) => (
              <a
                key={c.key}
                href={c.href}
                target={c.key === "whatsapp" ? "_blank" : undefined}
                rel={c.key === "whatsapp" ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-base px-3.5 py-1.5 text-sm font-bold text-primary transition-colors hover:border-brand-400/60 hover:text-brand-400"
                dir="ltr"
              >
                <c.icon className="size-4" />
                {c.label}
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">{t("developers.contactUnavailable")}</p>
        )}
      </div>
    </div>
  );
}
