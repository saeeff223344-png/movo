import type { Metadata } from "next";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { StatusCards } from "@/components/dashboard/StatusCards";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { InspirationRow } from "@/components/dashboard/InspirationRow";
import { RecentVideos } from "@/components/dashboard/RecentVideos";

export const metadata: Metadata = {
  title: "لوحة التحكم | Dashboard — MOVO",
};

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <WelcomeHeader />
      <StatusCards />
      <QuickActions />
      <RecentProjects />
      <RecentVideos />
      <InspirationRow />
    </div>
  );
}
