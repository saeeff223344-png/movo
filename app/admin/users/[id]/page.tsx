import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUser, getTrial, getUserNotes } from "@/lib/admin/services/customers";
import { getSubscriptionsByUser, getPaymentsByUser } from "@/lib/admin/services/billing";
import {
  getProjectsByUser,
  getVideosByUser,
  getAIJobsByUser,
  getRenderJobsByUser,
} from "@/lib/admin/services/production";
import { getSupportTicketsByUser } from "@/lib/admin/services/support";
import { UserDetailView } from "@/components/admin/users/UserDetailView";

export const metadata: Metadata = {
  title: "تفاصيل المستخدم | User details — MOVO Admin",
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser(id);
  if (!user) notFound();

  const [trial, notes, subscriptions, payments, projects, videos, aiJobs, renderJobs, tickets] = await Promise.all([
    getTrial(id),
    getUserNotes(id),
    getSubscriptionsByUser(id),
    getPaymentsByUser(id),
    getProjectsByUser(id),
    getVideosByUser(id),
    getAIJobsByUser(id),
    getRenderJobsByUser(id),
    getSupportTicketsByUser(id),
  ]);

  return (
    <UserDetailView
      user={user}
      trial={trial}
      subscriptions={subscriptions}
      payments={payments}
      projects={projects}
      videos={videos}
      aiJobs={aiJobs}
      renderJobs={renderJobs}
      tickets={tickets}
      notes={notes}
    />
  );
}
