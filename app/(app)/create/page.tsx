import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateWorkspace } from "@/components/create/CreateWorkspace";
import { getCurrentSubscriptionStatus, getCurrentTrialStatus } from "@/lib/supabase/subscription-status";

export const metadata: Metadata = {
  title: "إنشاء فيديو جديد | Create video — MOVO",
};

export default async function CreatePage() {
  const [subscription, trial] = await Promise.all([getCurrentSubscriptionStatus(), getCurrentTrialStatus()]);
  return (
    <Suspense fallback={null}>
      <CreateWorkspace trialUsed={trial.used} subscriptionActive={subscription.active} />
    </Suspense>
  );
}
