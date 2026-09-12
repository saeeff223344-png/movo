import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ContactChannel = { enabled: boolean; value: string };

export type SupportContact = {
  phone: ContactChannel;
  whatsapp: ContactChannel;
  email: ContactChannel;
  telegram: ContactChannel;
  instagram: ContactChannel;
  facebook: ContactChannel;
  x: ContactChannel;
  workingHours: string;
};

export type SubscriptionContact = {
  phone: ContactChannel;
  whatsapp: ContactChannel;
  email: ContactChannel;
  instructionsAr: string;
  instructionsEn: string;
};

export type PaymentContact = {
  phone: ContactChannel;
  whatsapp: ContactChannel;
  instructionsAr: string;
  instructionsEn: string;
};

export type SubscriptionContactPerson = {
  id: string;
  nameAr: string;
  nameEn: string;
  whatsapp: string;
};

/**
 * Active rows from public.subscription_contacts (014_subscription_contacts.sql),
 * ordered for display. RLS already limits an anon/authenticated caller to
 * active=true; the eq("active", true) here just makes that intent explicit
 * rather than relying solely on the policy. Falls back to [] (never throws)
 * so callers can treat "no contacts configured yet" and "query failed" the
 * same way: show the legacy subscriptionContact.whatsapp field instead.
 */
export async function getSubscriptionContacts(): Promise<SubscriptionContactPerson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_contacts")
    .select("id, name_ar, name_en, whatsapp")
    .eq("active", true)
    .order("display_order");
  if (error || !data) return [];

  return data.map((c) => ({
    id: c.id,
    nameAr: c.name_ar,
    nameEn: c.name_en,
    whatsapp: c.whatsapp,
  }));
}

type AllContactSettings = {
  supportContact?: SupportContact;
  subscriptionContact?: SubscriptionContact;
  paymentContact?: PaymentContact;
};

/**
 * Reads system_settings.{support,subscription,payment}_contact via the
 * get_contact_settings() RPC (011_public_contact_settings.sql) — the same
 * jsonb the admin edits at /admin/settings → Contact, exposed narrowly
 * rather than opening up the whole (admin-only) system_settings table.
 * Returns null only on a genuine query failure, never a fabricated value.
 */
async function getContactSettings(): Promise<AllContactSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_contact_settings");
  if (error || !data) return null;
  return data as AllContactSettings;
}

export async function getSupportContact(): Promise<SupportContact | null> {
  const settings = await getContactSettings();
  return settings?.supportContact ?? null;
}

export async function getSubscriptionContact(): Promise<SubscriptionContact | null> {
  const settings = await getContactSettings();
  return settings?.subscriptionContact ?? null;
}

export async function getPaymentContact(): Promise<PaymentContact | null> {
  const settings = await getContactSettings();
  return settings?.paymentContact ?? null;
}

/** For pages that need more than one block — a single RPC round trip instead of two/three. */
export async function getAllContactSettings(): Promise<AllContactSettings | null> {
  return getContactSettings();
}
