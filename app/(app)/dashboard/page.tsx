import type { Metadata } from "next";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { StatusCards } from "@/components/dashboard/StatusCards";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { InspirationRow } from "@/components/dashboard/InspirationRow";
import { RecentVideos } from "@/components/dashboard/RecentVideos";
import { getCurrentSubscriptionStatus, getCurrentTrialStatus } from "@/lib/supabase/subscription-status";

export const metadata: Metadata = {
  title: "لوحة التحكم | Dashboard — MOVO",
};

export default async function DashboardPage() {
  const [subscription, trial] = await Promise.all([getCurrentSubscriptionStatus(), getCurrentTrialStatus()]);
  return (
    <div className="space-y-10">
      <WelcomeHeader />
      <StatusCards trial={trial} subscription={subscription} />
      <QuickActions />
      <RecentProjects />
      <RecentVideos />
      <InspirationRow />
    </div>
  );
}
