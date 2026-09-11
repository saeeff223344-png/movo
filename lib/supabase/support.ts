import "server-only";
import { getSession } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import type { SupportRequest, SupportStatus } from "@/lib/data/support-requests";

const STATUS_MAP: Record<string, SupportStatus> = {
  open: "new",
  in_progress: "in_progress",
  waiting_user: "in_progress",
  resolved: "resolved",
  closed: "resolved",
};

/**
 * The current user's own support tickets (support_tickets, RLS: "user can
 * manage own" — auth.uid() = user_id) — same table /admin/support reads.
 */
export async function getMySupportRequests(): Promise<SupportRequest[]> {
  const user = await getSession();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("support_tickets")
    .select("id, subject, category, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map((t) => ({
    id: `SUP-${t.id.slice(0, 8).toUpperCase()}`,
    title: t.subject,
    type: t.category,
    status: STATUS_MAP[t.status] ?? "new",
    createdAt: t.created_at.slice(0, 10),
  }));
}
