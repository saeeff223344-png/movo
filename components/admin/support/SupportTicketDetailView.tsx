"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import { SelectField } from "@/components/admin/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { AdminSupportTicket, SupportStatus } from "@/lib/admin/types/support";
import { updateTicketStatusAction, replyToTicketAction } from "@/lib/admin/actions/support-actions";

const TONE: Record<SupportStatus, "info" | "warning" | "success" | "neutral"> = {
  open: "info",
  in_progress: "warning",
  waiting_user: "warning",
  resolved: "success",
  closed: "neutral",
};

export function SupportTicketDetailView({ ticket: initialTicket }: { ticket: AdminSupportTicket }) {
  const { t } = useI18n();
  const [ticket, setTicket] = useState(initialTicket);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function sendReply() {
    if (!reply.trim()) return;
    const text = reply.trim();
    setSending(true);
    setReply("");
    setTicket((prev) => ({
      ...prev,
      status: "waiting_user",
      lastReplyAt: new Date().toISOString(),
      messages: [
        ...prev.messages,
        { id: `msg_${Date.now()}`, author: t("admin.support.you"), authorType: "admin", message: text, createdAt: new Date().toISOString() },
      ],
    }));
    await replyToTicketAction(ticket.id, text);
    setSending(false);
  }

  function changeStatus(status: SupportStatus) {
    setTicket({ ...ticket, status });
    void updateTicketStatusAction(ticket.id, status);
  }

  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title={ticket.subject}
        description={`${ticket.userName} · ${ticket.id}`}
        backHref="/admin/support"
        actions={
          <SelectField
            value={ticket.status}
            onChange={changeStatus}
            options={[
              { value: "open", label: t("admin.status.open") },
              { value: "in_progress", label: t("admin.status.in_progress") },
              { value: "waiting_user", label: t("admin.status.waiting_user") },
              { value: "resolved", label: t("admin.status.resolved") },
              { value: "closed", label: t("admin.status.closed") },
            ]}
          />
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge label={t(`admin.status.${ticket.status}`)} tone={TONE[ticket.status]} />
        <StatusBadge label={t(`admin.priority.${ticket.priority}`)} tone="neutral" />
        <StatusBadge label={t(`admin.supportCategory.${ticket.category}`)} tone="neutral" />
      </div>

      <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface p-4">
        {ticket.messages.map((m) => (
          <div key={m.id} className={`rounded-xl p-3 text-sm ${m.authorType === "admin" ? "bg-brand-500/10" : "bg-base"}`}>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-primary">{m.author}</span>
              <span className="text-[11px] text-muted">
                <DateDisplay value={m.createdAt} withTime />
              </span>
            </div>
            <p className="text-secondary">{m.message}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={t("admin.support.replyPlaceholder")}
          className="flex-1 rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-primary placeholder-muted outline-none focus:border-brand-400/60"
        />
        <Button size="sm" onClick={sendReply} disabled={sending}>
          <Send className="size-4" />
          {sending ? t("common.loading") : t("admin.support.reply")}
        </Button>
      </div>
    </div>
  );
}
