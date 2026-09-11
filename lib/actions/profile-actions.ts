"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";

export type UpdateProfileResult =
  | { ok: true; emailChangePending: boolean }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * full_name updates profiles directly (RLS: "profiles: user can update own").
 * Email goes through supabase.auth.updateUser({ email }) — Supabase's normal
 * double opt-in change flow — so profiles.email is deliberately NOT touched
 * here; it only changes once the user confirms via the email link, synced
 * automatically by the trigger in 013_profile_email_sync.sql.
 */
export async function updateProfileAction(input: {
  fullName: string;
  email: string;
}): Promise<UpdateProfileResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const fullName = input.fullName.trim();
  const email = input.email.trim();

  if (!fullName) return { ok: false, error: "INVALID_NAME" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "INVALID_EMAIL" };

  const { error: nameError } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (nameError) return { ok: false, error: nameError.message };

  let emailChangePending = false;
  if (email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    const { error: emailError } = await supabase.auth.updateUser({ email });
    if (emailError) return { ok: false, error: emailError.message };
    emailChangePending = true;
  }

  revalidatePath("/settings");
  return { ok: true, emailChangePending };
}
