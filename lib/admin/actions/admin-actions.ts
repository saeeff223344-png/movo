"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requirePermission, requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/admin/types/admin";
import type { AdminPermission } from "@/lib/admin/config/permissions";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateAdminAction(
  id: string,
  input: { fullName: string; role: AdminRole; permissions: AdminPermission[] },
): Promise<ActionResult> {
  await requirePermission("admins", "manage");
  const supabase = await createClient();

  const { error: profileErr } = await supabase.from("profiles").update({ full_name: input.fullName }).eq("id", id);
  if (profileErr) return { ok: false, error: profileErr.message };

  const { error: roleErr } = await supabase.from("admin_profiles").update({ role: input.role }).eq("user_id", id);
  if (roleErr) return { ok: false, error: roleErr.message };

  // Permissions are replaced wholesale: delete then insert the new set.
  // super_admin rows never carry explicit permission rows — has_permission()
  // short-circuits true for them regardless (see 002_admin_roles_permissions.sql).
  await supabase.from("admin_permissions").delete().eq("admin_user_id", id);
  if (input.role === "admin" && input.permissions.length > 0) {
    const { error: permErr } = await supabase
      .from("admin_permissions")
      .insert(input.permissions.map((permission) => ({ admin_user_id: id, permission })));
    if (permErr) return { ok: false, error: permErr.message };
  }

  const actor = await requireUser();
  await supabase.from("audit_logs").insert({
    admin_id: actor.id,
    action: "admin.updated",
    entity: "admin_profiles",
    entity_id: id,
    target_user: id,
    new_value: input.role,
  });

  revalidatePath("/admin/admins");
  revalidatePath(`/admin/admins/${id}`);
  return { ok: true };
}

async function setAdminStatus(id: string, status: "active" | "suspended"): Promise<ActionResult> {
  await requirePermission("admins", "manage");
  const actor = await requireUser();

  if (status === "suspended" && actor.id === id) {
    return { ok: false, error: "CANNOT_SUSPEND_SELF" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("admin_profiles").update({ status }).eq("user_id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    admin_id: actor.id,
    action: status === "suspended" ? "admin.suspended" : "admin.reactivated",
    entity: "admin_profiles",
    entity_id: id,
    target_user: id,
  });

  revalidatePath("/admin/admins");
  revalidatePath(`/admin/admins/${id}`);
  return { ok: true };
}

export async function suspendAdminAction(id: string) {
  return setAdminStatus(id, "suspended");
}

export async function reactivateAdminAction(id: string) {
  return setAdminStatus(id, "active");
}

/**
 * Sends a real Supabase password-reset email (the same flow as the public
 * "forgot password" page — see docs/auth-flow.md) rather than generating or
 * storing a new password anywhere in this app. Marks require_password_change
 * so the admin is prompted again on next login regardless of when they
 * follow the email link.
 */
export async function resetAdminPasswordAction(id: string): Promise<ActionResult> {
  await requirePermission("admins", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", id).single();
  if (!profile?.email) return { ok: false, error: "ADMIN_NOT_FOUND" };

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? `https://${requestHeaders.get("host") ?? ""}`;

  // A plain (non-service-role) client is enough — resetPasswordForEmail is a
  // public Auth endpoint, not a privileged one (see docs/auth-flow.md).
  const { error: linkError } = await supabase.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (linkError) return { ok: false, error: linkError.message };

  await supabase.from("admin_profiles").update({ require_password_change: true }).eq("user_id", id);
  await supabase.from("audit_logs").insert({
    admin_id: actor.id,
    action: "admin.password_reset_requested",
    entity: "admin_profiles",
    entity_id: id,
    target_user: id,
  });

  revalidatePath(`/admin/admins/${id}`);
  return { ok: true };
}
