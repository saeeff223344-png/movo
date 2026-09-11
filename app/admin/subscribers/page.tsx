import type { Metadata } from "next";
import { getSubscriptions } from "@/lib/admin/services/billing";
import { SubscribersView } from "@/components/admin/subscribers/SubscribersView";

export const metadata: Metadata = {
  title: "المشتركون | Subscribers — MOVO Admin",
};

export default async function AdminSubscribersPage() {
  const subscriptions = await getSubscriptions();
  return <SubscribersView subscriptions={subscriptions} />;
}
