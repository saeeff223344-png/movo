import "server-only";
import { createClient } from "@/lib/supabase/server";

export type SearchIndexEntry = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  groupKey: "users" | "admins" | "subscriptions" | "codes" | "payments" | "projects" | "videos" | "support";
};

/**
 * A light index for the admin ⌘K search (GlobalSearch.tsx) — id/title/
 * subtitle/href only, not full domain objects, kept reasonably small since
 * it loads on every admin page via AdminShell. RLS still applies: an admin
 * without the matching `.read` permission on a given table simply gets an
 * empty slice back for that group, same as browsing that section directly.
 */
export async function getGlobalSearchIndex(): Promise<SearchIndexEntry[]> {
  const supabase = await createClient();

  const [
    { data: profiles },
    { data: admins },
    { data: subs },
    { data: codes },
    { data: payments },
    { data: projects },
    { data: videos },
    { data: tickets },
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").limit(200),
    supabase.from("admin_profiles").select("user_id, role").limit(100),
    supabase.from("subscriptions").select("id, user_id, plan_id, status").eq("status", "active").limit(200),
    supabase.from("activation_codes").select("id, code, plan_id").limit(200),
    supabase.from("payments").select("id, user_id, amount_iqd").limit(200),
    supabase.from("projects").select("id, owner_id, business_name").limit(200),
    supabase.from("videos").select("id, owner_id, resolution").limit(200),
    supabase.from("support_tickets").select("id, user_id, subject").limit(200),
  ]);

  const [{ data: plans }] = await Promise.all([supabase.from("subscription_plans").select("id, name_ar")]);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? p.email ?? ""]));
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email ?? ""]));
  const planNameById = new Map((plans ?? []).map((p) => [p.id, p.name_ar]));

  const entries: SearchIndexEntry[] = [];

  for (const u of profiles ?? []) {
    entries.push({ id: u.id, title: u.full_name ?? "", subtitle: `${u.email ?? ""} · ${u.id}`, href: `/admin/users/${u.id}`, groupKey: "users" });
  }
  for (const a of admins ?? []) {
    entries.push({ id: a.user_id, title: nameById.get(a.user_id) ?? "", subtitle: `${emailById.get(a.user_id) ?? ""} · ${a.role}`, href: `/admin/admins/${a.user_id}`, groupKey: "admins" });
  }
  for (const s of subs ?? []) {
    entries.push({ id: s.id, title: nameById.get(s.user_id) ?? "", subtitle: `${planNameById.get(s.plan_id) ?? ""} · ${s.id}`, href: `/admin/subscriptions/${s.id}`, groupKey: "subscriptions" });
  }
  for (const c of codes ?? []) {
    entries.push({ id: c.id, title: c.code, subtitle: planNameById.get(c.plan_id) ?? "", href: `/admin/activation-codes`, groupKey: "codes" });
  }
  for (const p of payments ?? []) {
    entries.push({ id: p.id, title: `${nameById.get(p.user_id) ?? ""} — ${p.amount_iqd.toLocaleString()} IQD`, subtitle: p.id, href: `/admin/payments/${p.id}`, groupKey: "payments" });
  }
  for (const p of projects ?? []) {
    entries.push({ id: p.id, title: p.business_name ?? "", subtitle: `${nameById.get(p.owner_id) ?? ""} · ${p.id}`, href: `/admin/projects/${p.id}`, groupKey: "projects" });
  }
  for (const v of videos ?? []) {
    entries.push({ id: v.id, title: v.id, subtitle: `${nameById.get(v.owner_id) ?? ""} · ${v.resolution}`, href: `/admin/videos/${v.id}`, groupKey: "videos" });
  }
  for (const tk of tickets ?? []) {
    entries.push({ id: tk.id, title: tk.subject, subtitle: `${nameById.get(tk.user_id) ?? ""} · ${tk.id}`, href: `/admin/support/${tk.id}`, groupKey: "support" });
  }

  return entries;
}
