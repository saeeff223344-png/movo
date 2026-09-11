"use client";

import { HelpCircle, Mail, Phone, MessageCircle, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { SubscriptionContact, PaymentContact } from "@/lib/supabase/contact";

/**
 * Real WhatsApp/phone/email contact channels for buying a subscription —
 * read from system_settings.subscription_contact (same row /admin/settings
 * → Contact edits, see lib/supabase/contact.ts). Deliberately not a link to
 * /support: getting an activation code is a sales/payment conversation, not
 * a technical support ticket.
 */
export function HowToGetCode({
  contact,
  paymentContact,
}: {
  contact: SubscriptionContact | null;
  paymentContact: PaymentContact | null;
}) {
  const { t, locale } = useI18n();

  const channels = contact
    ? [
        contact.whatsapp.enabled && contact.whatsapp.value
          ? {
              key: "whatsapp",
              icon: MessageCircle,
              label: t("subscription.contactWhatsapp"),
              href: `https://wa.me/${contact.whatsapp.value.replace(/[^0-9]/g, "")}`,
            }
          : null,
        contact.phone.enabled && contact.phone.value
          ? { key: "phone", icon: Phone, label: t("subscription.contactPhone"), href: `tel:${contact.phone.value.replace(/\s/g, "")}` }
          : null,
        contact.email.enabled && contact.email.value
          ? { key: "email", icon: Mail, label: t("subscription.contactEmail"), href: `mailto:${contact.email.value}` }
          : null,
      ].filter((c): c is NonNullable<typeof c> => c !== null)
    : [];

  const description = contact
    ? (locale === "ar" ? contact.instructionsAr : contact.instructionsEn) || t("subscription.howToGetCodeDesc")
    : t("subscription.contactUnavailable");

  const paymentInstructions = paymentContact
    ? (locale === "ar" ? paymentContact.instructionsAr : paymentContact.instructionsEn)
    : "";

  return (
    <div className="flex gap-4 rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-hover text-muted">
        <HelpCircle className="size-5" />
      </span>
      <div>
        <h3 className="text-sm font-bold text-primary">
          {t("subscription.howToGetCode")}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>

        {channels.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
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
        )}

        {paymentInstructions && (
          <div className="mt-4 flex gap-2 border-t border-border-subtle pt-4">
            <Wallet className="mt-0.5 size-4 shrink-0 text-muted" />
            <p className="text-sm leading-relaxed text-muted">{paymentInstructions}</p>
          </div>
        )}
      </div>
    </div>
  );
}
