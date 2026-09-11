"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Announcement, SupportStatus } from "@/lib/admin/types/support";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateTicketStatusAction(id: string, status: SupportStatus): Promise<ActionResult> {
  await requirePermission("support", "manage");
  const supabase = await createClient();
  const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${id}`);
  return { ok: true };
}

export async function replyToTicketAction(id: string, message: string): Promise<ActionResult> {
  await requirePermission("support", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const { error: msgError } = await supabase.from("support_messages").insert({
    ticket_id: id,
    author_id: actor.id,
    author_type: "admin",
    message,
  });
  if (msgError) return { ok: false, error: msgError.message };

  await supabase
    .from("support_tickets")
    .update({ last_reply_at: new Date().toISOString(), status: "waiting_user" })
    .eq("id", id);

  revalidatePath(`/admin/support/${id}`);
  revalidatePath("/admin/support");
  return { ok: true };
}

// ---- Announcements ----
type AnnouncementInput = Omit<Announcement, "id" | "createdAt" | "updatedAt" | "updatedBy">;

export async function createAnnouncementAction(
  input: AnnouncementInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requirePermission("announcements", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title_ar: input.titleAr,
      title_en: input.titleEn,
      message_ar: input.messageAr,
      message_en: input.messageEn,
      type: input.type,
      location: input.location,
      start_at: input.startAt,
      end_at: input.endAt,
      dismissible: input.dismissible,
      enabled: input.enabled,
      audience: input.audience,
      updated_by: actor.id,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "INSERT_FAILED" };
  revalidatePath("/admin/announcements");
  return { ok: true, id: data.id };
}

export async function updateAnnouncementAction(
  id: string,
  patch: Partial<AnnouncementInput>,
): Promise<ActionResult> {
  await requirePermission("announcements", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const update: Database["public"]["Tables"]["announcements"]["Update"] = { updated_by: actor.id };
  if (patch.titleAr !== undefined) update.title_ar = patch.titleAr;
  if (patch.titleEn !== undefined) update.title_en = patch.titleEn;
  if (patch.messageAr !== undefined) update.message_ar = patch.messageAr;
  if (patch.messageEn !== undefined) update.message_en = patch.messageEn;
  if (patch.type !== undefined) update.type = patch.type;
  if (patch.location !== undefined) update.location = patch.location;
  if (patch.startAt !== undefined) update.start_at = patch.startAt;
  if (patch.endAt !== undefined) update.end_at = patch.endAt;
  if (patch.dismissible !== undefined) update.dismissible = patch.dismissible;
  if (patch.enabled !== undefined) update.enabled = patch.enabled;
  if (patch.audience !== undefined) update.audience = patch.audience;

  const { error } = await supabase.from("announcements").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/announcements");
  return { ok: true };
}
