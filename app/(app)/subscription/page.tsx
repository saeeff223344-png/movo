import type { Metadata } from "next";
import { SubscriptionView } from "@/components/subscription/SubscriptionView";
import { getCurrentSubscriptionStatus, getCurrentTrialStatus } from "@/lib/supabase/subscription-status";
import { getPublicPlans } from "@/lib/supabase/plans";

export const metadata: Metadata = {
  title: "الاشتراك | Subscription — MOVO",
};

export default async function SubscriptionPage() {
  const [subscription, trial, plans] = await Promise.all([
    getCurrentSubscriptionStatus(),
    getCurrentTrialStatus(),
    getPublicPlans(),
  ]);
  return <SubscriptionView initialSubscription={subscription} trialUsed={trial.used} plans={plans} />;
}
