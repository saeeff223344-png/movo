"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";

async function setUserStatus(userId: string, status: "active" | "suspended") {
  await requirePermission("users", "manage");
  const currentAdmin = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ account_status: status }).eq("id", userId);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from("audit_logs").insert({
    admin_id: currentAdmin.id,
    action: status === "suspended" ? "user.suspended" : "user.unsuspended",
    entity: "profiles",
    entity_id: userId,
    target_user: userId,
    new_value: status,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true as const };
}

export async function suspendUserAction(userId: string) {
  return setUserStatus(userId, "suspended");
}

export async function unsuspendUserAction(userId: string) {
  return setUserStatus(userId, "active");
}
