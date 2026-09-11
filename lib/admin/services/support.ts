import "server-only";
import type { AdminSupportTicket, SupportMessage } from "@/lib/admin/types/support";
import type { AdminNotification, Announcement } from "@/lib/admin/types/support";
import { createClient } from "@/lib/supabase/server";

async function nameMap() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name");
  return new Map((data ?? []).map((p) => [p.id, p.full_name ?? ""]));
}

async function mapTickets(userId?: string): Promise<AdminSupportTicket[]> {
  const supabase = await createClient();
  let query = supabase.from("support_tickets").select("*").order("last_reply_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const [{ data: tickets }, { data: messages }, names] = await Promise.all([
    query,
    supabase.from("support_messages").select("*").order("created_at", { ascending: true }),
    nameMap(),
  ]);

  const messagesByTicket = new Map<string, SupportMessage[]>();
  for (const m of messages ?? []) {
    const list = messagesByTicket.get(m.ticket_id) ?? [];
    list.push({
      id: m.id,
      author: names.get(m.author_id) ?? m.author_id,
      authorType: m.author_type as SupportMessage["authorType"],
      message: m.message,
      createdAt: m.created_at,
    });
    messagesByTicket.set(m.ticket_id, list);
  }

  return (tickets ?? []).map((t) => ({
    id: t.id,
    userId: t.user_id,
    userName: names.get(t.user_id) ?? "",
    subject: t.subject,
    category: t.category as AdminSupportTicket["category"],
    priority: t.priority as AdminSupportTicket["priority"],
    status: t.status as AdminSupportTicket["status"],
    assignedAdmin: t.assigned_admin ? (names.get(t.assigned_admin) ?? t.assigned_admin) : null,
    createdAt: t.created_at,
    lastReplyAt: t.last_reply_at,
    messages: messagesByTicket.get(t.id) ?? [],
  } satisfies AdminSupportTicket));
}

export async function getSupportTickets(): Promise<AdminSupportTicket[]> {
  return mapTickets();
}
export async function getSupportTicket(id: string): Promise<AdminSupportTicket | undefined> {
  const all = await mapTickets();
  return all.find((t) => t.id === id);
}
export async function getSupportTicketsByUser(userId: string): Promise<AdminSupportTicket[]> {
  return mapTickets(userId);
}

// ---- Notifications (admin feed only — audience = 'admin') ----
export async function getNotifications(): Promise<AdminNotification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("audience", "admin")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type as AdminNotification["type"],
    titleAr: n.title_ar,
    titleEn: n.title_en,
    messageAr: n.message_ar,
    messageEn: n.message_en,
    read: n.read,
    createdAt: n.created_at,
  }));
}

// ---- Announcements ----
function mapAnnouncement(a: {
  id: string;
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  type: string;
  location: string;
  start_at: string | null;
  end_at: string | null;
  dismissible: boolean;
  enabled: boolean;
  audience: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}): Announcement {
  return {
    id: a.id,
    titleAr: a.title_ar,
    titleEn: a.title_en,
    messageAr: a.message_ar,
    messageEn: a.message_en,
    type: a.type as Announcement["type"],
    location: a.location as Announcement["location"],
    startAt: a.start_at,
    endAt: a.end_at,
    dismissible: a.dismissible,
    enabled: a.enabled,
    audience: a.audience as Announcement["audience"],
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    updatedBy: a.updated_by ?? "",
  };
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(mapAnnouncement);
}

export async function getAnnouncement(id: string): Promise<Announcement | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("announcements").select("*").eq("id", id).maybeSingle();
  return data ? mapAnnouncement(data) : undefined;
}
