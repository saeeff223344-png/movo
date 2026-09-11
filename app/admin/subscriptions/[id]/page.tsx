import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSubscription } from "@/lib/admin/services/billing";
import { SubscriptionDetailView } from "@/components/admin/subscriptions/SubscriptionDetailView";

export const metadata: Metadata = {
  title: "تفاصيل الاشتراك | Subscription details — MOVO Admin",
};

export default async function AdminSubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subscription = await getSubscription(id);
  if (!subscription) notFound();
  return <SubscriptionDetailView subscription={subscription} />;
}
