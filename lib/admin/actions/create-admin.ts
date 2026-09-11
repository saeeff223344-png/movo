"use server";

import { requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminRole } from "@/lib/admin/types/admin";
import { allPermissions, type AdminPermission } from "@/lib/admin/config/permissions";

export type CreateAdminInput = {
  fullName: string;
  email: string;
  /** Generated client-side and shown once in the UI — never persisted anywhere. */
  temporaryPassword: string;
  role: AdminRole;
  permissions: AdminPermission[];
  requirePasswordChange: boolean;
};

export type CreateAdminResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * The ONLY way admin accounts get created (see docs/admin-auth.md — never
 * the public /signup flow). Runs entirely server-side with the service-role
 * client so it can call the Supabase Auth Admin API directly. The temporary
 * password is forwarded to that API call and then never touched again —
 * it is not written to any table this app controls.
 */
export async function createAdmin(input: CreateAdminInput): Promise<CreateAdminResult> {
  // requirePermission() redirects on failure; for a Server Action invoked
  // from a drawer we want a returned error instead, so re-check manually.
  const currentUser = await requireUser();
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("has_permission", {
    perm: "admins.manage",
    check_uid: currentUser.id,
  });
  if (!allowed) {
    return { ok: false, error: "PERMISSION_DENIED" };
  }

  if (!input.fullName.trim() || !input.email.trim() || !input.temporaryPassword) {
    return { ok: false, error: "INVALID_INPUT" };
  }

  const adminClient = createAdminClient();

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: input.email.trim(),
    password: input.temporaryPassword,
    email_confirm: true, // admin-created accounts don't need email verification
    user_metadata: { full_name: input.fullName.trim() },
  });

  if (createError || !created.user) {
    return { ok: false, error: createError?.message ?? "AUTH_CREATE_FAILED" };
  }

  const newUserId = created.user.id;

  const { error: profileError } = await adminClient.from("admin_profiles").insert({
    user_id: newUserId,
    role: input.role,
    status: "active",
    require_password_change: input.requirePasswordChange,
    created_by: currentUser.id,
  });

  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned account with no
    // admin_profiles row (which would otherwise show up as a normal user).
    await adminClient.auth.admin.deleteUser(newUserId);
    return { ok: false, error: profileError.message };
  }

  const grantedPermissions = input.role === "super_admin" ? [] : input.permissions;
  if (grantedPermissions.length > 0) {
    await adminClient.from("admin_permissions").insert(
      grantedPermissions.map((permission) => ({ admin_user_id: newUserId, permission })),
    );
  }

  await adminClient.from("audit_logs").insert({
    admin_id: currentUser.id,
    action: "admin.created",
    entity: "admin_profiles",
    entity_id: newUserId,
    target_user: newUserId,
    new_value: input.role,
    metadata: { email: input.email.trim() },
  });

  return { ok: true, userId: newUserId };
}

// Re-exported for the small "all permissions" convenience the drawer uses
// when role === 'super_admin'.
export { allPermissions };
