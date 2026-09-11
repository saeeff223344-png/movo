import type { Metadata } from "next";
import { getSupportTickets } from "@/lib/admin/services/support";
import { SupportTicketsView } from "@/components/admin/support/SupportTicketsView";

export const metadata: Metadata = {
  title: "الدعم | Support — MOVO Admin",
};

export default async function AdminSupportPage() {
  const tickets = await getSupportTickets();
  return <SupportTicketsView tickets={tickets} />;
}
