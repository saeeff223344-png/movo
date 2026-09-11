import type { Metadata } from "next";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { StatusCards } from "@/components/dashboard/StatusCards";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { InspirationRow } from "@/components/dashboard/InspirationRow";
import { RecentVideos } from "@/components/dashboard/RecentVideos";
import { getCurrentSubscriptionStatus, getCurrentTrialStatus } from "@/lib/supabase/subscription-status";
import { getCurrentProfile } from "@/lib/supabase/auth-helpers";
import { getPublicExamples } from "@/lib/supabase/examples";

export const metadata: Metadata = {
  title: "لوحة التحكم | Dashboard — MOVO",
};

export default async function DashboardPage() {
  const [subscription, trial, profile, examples] = await Promise.all([
    getCurrentSubscriptionStatus(),
    getCurrentTrialStatus(),
    getCurrentProfile(),
    getPublicExamples(),
  ]);
  return (
    <div className="space-y-10">
      <WelcomeHeader fullName={profile?.full_name || "MOVO"} />
      <StatusCards trial={trial} subscription={subscription} />
      <QuickActions />
      <RecentProjects />
      <RecentVideos />
      <InspirationRow examples={examples} />
    </div>
  );
}
