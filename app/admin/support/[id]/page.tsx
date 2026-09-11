import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupportTicket } from "@/lib/admin/services/support";
import { SupportTicketDetailView } from "@/components/admin/support/SupportTicketDetailView";

export const metadata: Metadata = {
  title: "تفاصيل طلب الدعم | Ticket details — MOVO Admin",
};

export default async function AdminSupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getSupportTicket(id);
  if (!ticket) notFound();
  return <SupportTicketDetailView ticket={ticket} />;
}
