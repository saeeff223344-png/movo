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
