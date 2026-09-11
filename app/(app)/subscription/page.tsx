import type { Metadata } from "next";
import { SubscriptionView } from "@/components/subscription/SubscriptionView";

export const metadata: Metadata = {
  title: "الاشتراك | Subscription — MOVO",
};

export default function SubscriptionPage() {
  return <SubscriptionView />;
}
