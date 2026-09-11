import type { Metadata } from "next";
import { getSubscriptions } from "@/lib/admin/services/billing";
import { SubscriptionsView } from "@/components/admin/subscriptions/SubscriptionsView";

export const metadata: Metadata = {
  title: "الاشتراكات | Subscriptions — MOVO Admin",
};

export default async function AdminSubscriptionsPage() {
  const subscriptions = await getSubscriptions();
  return <SubscriptionsView subscriptions={subscriptions} />;
}
