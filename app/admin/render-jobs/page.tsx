import type { Metadata } from "next";
import { getRenderJobs } from "@/lib/admin/services/production";
import { RenderJobsView } from "@/components/admin/render-jobs/RenderJobsView";

export const metadata: Metadata = {
  title: "Render Jobs — MOVO Admin",
};

export default async function AdminRenderJobsPage() {
  const jobs = await getRenderJobs();
  return <RenderJobsView jobs={jobs} />;
}
