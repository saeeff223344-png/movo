"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";

// Maps the SupportForm's existing dropdown option keys to the DB's
// support_tickets.category check constraint (005_support_content_settings.sql)
// — the visible labels/options don't change, only where each one is stored.
const CATEGORY_MAP: Record<string, string> = {
  issueTypeAccount: "account",
  issueTypeSubscription: "subscription",
  issueTypeVideo: "video",
  issueTypeExport: "render",
  issueTypeTechnical: "technical",
  issueTypeOther: "other",
};

export type SubmitSupportTicketResult = { ok: true } | { ok: false; error: string };

export async function submitSupportTicketAction(input: {
  title: string;
  issueType: string;
  description: string;
}): Promise<SubmitSupportTicketResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || !description) return { ok: false, error: "INVALID_INPUT" };

  const category = CATEGORY_MAP[input.issueType] ?? "other";

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({ user_id: user.id, subject: title, category })
    .select("id")
    .single();

  if (ticketError || !ticket) return { ok: false, error: ticketError?.message ?? "INSERT_FAILED" };

  const { error: messageError } = await supabase.from("support_messages").insert({
    ticket_id: ticket.id,
    author_id: user.id,
    author_type: "user",
    message: description,
  });

  if (messageError) return { ok: false, error: messageError.message };

  revalidatePath("/support");
  return { ok: true };
}
