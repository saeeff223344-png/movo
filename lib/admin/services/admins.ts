import "server-only";
import type { AdminAccount } from "@/lib/admin/types/admin";
import type { AdminPermission } from "@/lib/admin/config/permissions";
import { createClient } from "@/lib/supabase/server";

/**
 * Real Supabase-backed admin-account reads. Mutations (create, permission
 * updates, suspend/reactivate, password reset) live in
 * lib/admin/actions/admin-actions.ts — see lib/admin/actions/create-admin.ts
 * for account creation specifically, which needs the service-role client.
 */

async function mapAdmins(): Promise<AdminAccount[]> {
  const supabase = await createClient();

  const [{ data: admins }, { data: perms }, { data: profiles }] = await Promise.all([
    supabase.from("admin_profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("admin_permissions").select("admin_user_id, permission"),
    supabase.from("profiles").select("id, full_name, email"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const permsByAdmin = new Map<string, AdminPermission[]>();
  for (const row of perms ?? []) {
    const list = permsByAdmin.get(row.admin_user_id) ?? [];
    list.push(row.permission as AdminPermission);
    permsByAdmin.set(row.admin_user_id, list);
  }
  const createdByName = new Map(
    (admins ?? []).map((a) => [a.user_id, profileById.get(a.user_id)?.full_name ?? ""]),
  );

  return (admins ?? []).map((a) => {
    const profile = profileById.get(a.user_id);
    return {
      id: a.user_id,
      fullName: profile?.full_name ?? "",
      email: profile?.email ?? "",
      role: a.role as AdminAccount["role"],
      permissions: permsByAdmin.get(a.user_id) ?? [],
      active: a.status === "active",
      requirePasswordChange: a.require_password_change,
      lastLoginAt: a.last_login_at,
      lastActivityAt: a.last_login_at,
      createdAt: a.created_at,
      createdBy: a.created_by ? (createdByName.get(a.created_by) ?? a.created_by) : "",
    } satisfies AdminAccount;
  });
}

export async function getAdmins(): Promise<AdminAccount[]> {
  return mapAdmins();
}

export async function getAdmin(id: string): Promise<AdminAccount | undefined> {
  const admins = await mapAdmins();
  return admins.find((a) => a.id === id);
}
