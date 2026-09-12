/**
 * Single source of truth for turning a saved WhatsApp number (in whatever
 * format an admin typed it) into a valid wa.me link. Used by every WhatsApp
 * button in the app (subscription contacts, support/join contact, developer
 * profiles) — never build a wa.me URL by hand elsewhere.
 *
 * Rules (in order):
 *  - strip spaces, dashes and parentheses
 *  - drop a leading "+" if present
 *  - a local Iraqi number starting with "0" (e.g. 07xxxxxxxxx) becomes
 *    964 + the rest (964xxxxxxxxx) — the leading 0 is dropped, not kept
 *  - a number already in international form (starts with 964, with or
 *    without a leading "+") is left as-is — the country code is never
 *    duplicated
 *  - any other non-digit characters are stripped as a last safety net
 *
 * This never changes what's displayed to the user (the raw saved value) —
 * only the link that gets built from it.
 */
export function normalizeWhatsAppNumber(raw: string): string {
  let digits = raw.trim().replace(/[\s\-()]/g, "");
  digits = digits.replace(/^\+/, "");
  digits = digits.replace(/[^0-9]/g, "");

  if (digits.startsWith("0") && !digits.startsWith("964")) {
    digits = `964${digits.slice(1)}`;
  }

  return digits;
}

export function buildWhatsAppLink(raw: string): string {
  return `https://wa.me/${normalizeWhatsAppNumber(raw)}`;
}
