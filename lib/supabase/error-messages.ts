/**
 * Maps raw Supabase Auth error messages to a translation key — never show
 * the raw driver/DB message to the user (see spec section 50: understandable
 * errors, no internals leaked).
 */
export function mapAuthErrorToKey(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) return "auth.errorInvalidCredentials";
  if (m.includes("email not confirmed")) return "auth.errorEmailNotConfirmed";
  if (m.includes("already registered") || m.includes("already exists")) return "auth.errorUserExists";
  if (m.includes("password") && m.includes("least")) return "auth.errorWeakPassword";
  if (m.includes("rate limit") || m.includes("only request this after")) return "auth.errorRateLimited";
  if (m.includes("invalid") && m.includes("code")) return "auth.errorInvalidCode";

  return "auth.errorGeneric";
}
