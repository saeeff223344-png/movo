import type { Metadata } from "next";
import { getAIJobs } from "@/lib/admin/services/production";
import { AIJobsView } from "@/components/admin/ai-jobs/AIJobsView";

export const metadata: Metadata = {
  title: "AI Jobs — MOVO Admin",
};

export default async function AdminAIJobsPage() {
  const jobs = await getAIJobs();
  return <AIJobsView jobs={jobs} />;
}
