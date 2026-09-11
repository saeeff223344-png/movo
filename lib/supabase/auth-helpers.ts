import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AdminPermission, PermissionAction, PermissionResource } from "@/lib/admin/config/permissions";
import { buildPermission } from "@/lib/admin/config/permissions";

/**
 * The server-side authorization boundary referenced throughout
 * docs/admin-permissions.md. Every one of these ultimately calls the
 * database's has_permission()/is_admin()/is_super_admin() SQL functions
 * (supabase/migrations/002_admin_roles_permissions.sql) — the frontend
 * hiding a button is a UX nicety, never the actual check.
 *
 * getSession/getCurrentProfile/getCurrentAdminProfile are wrapped in React's
 * cache() so that within a single request, calling them from the layout AND
 * the page (a very common pattern here) issues exactly one real network
 * round trip to Supabase Auth instead of one per call — auth.getUser()
 * always revalidates server-side by design (never trust the JWT payload
 * alone), so before this a single page load like /dashboard could fire 4-5
 * separate auth round trips. This changes nothing about what gets verified
 * or how often across requests — only dedupes repeats within one request.
 */

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async () => {
  const user = await getSession();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
});

export const getCurrentAdminProfile = cache(async () => {
  const user = await getSession();
  if (!user) return null;

  const supabase = await createClient();
  const { data: adminProfile } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!adminProfile) return null;

  const { data: permissionRows } = await supabase
    .from("admin_permissions")
    .select("permission")
    .eq("admin_user_id", user.id);

  return {
    ...adminProfile,
    permissions: (permissionRows ?? []).map((r) => r.permission) as AdminPermission[],
  };
});

/** Redirects to /login (preserving the intended destination) if not signed in. */
export async function requireUser(nextPath?: string) {
  const user = await getSession();
  if (!user) {
    redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  }
  return user;
}

/** Redirects home if the signed-in user is not an active admin (of either role). */
export async function requireAdmin() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: isAdmin, error } = await supabase.rpc("is_admin", { check_uid: user.id });
  if (error) console.error("[requireAdmin] is_admin() RPC failed:", error.message);
  if (!isAdmin) redirect("/");
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: isSuperAdmin, error } = await supabase.rpc("is_super_admin", { check_uid: user.id });
  if (error) console.error("[requireSuperAdmin] is_super_admin() RPC failed:", error.message);
  if (!isSuperAdmin) redirect("/admin");
  return user;
}

/**
 * Redirects to /admin (with a denied flag the page can read) if the current
 * admin lacks `resource.action`. Call at the top of any admin page/action
 * that reads or writes a specific resource.
 */
export async function requirePermission(resource: PermissionResource, action: PermissionAction = "read") {
  const user = await requireUser();
  const supabase = await createClient();
  const permission = buildPermission(resource, action);
  const { data: allowed, error } = await supabase.rpc("has_permission", { perm: permission, check_uid: user.id });
  if (error) console.error(`[requirePermission] has_permission("${permission}") RPC failed:`, error.message);
  if (!allowed) redirect("/admin?denied=1");
  return user;
}
