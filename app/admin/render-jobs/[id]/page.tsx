import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRenderJob } from "@/lib/admin/services/production";
import { RenderJobDetailView } from "@/components/admin/render-jobs/RenderJobDetailView";

export const metadata: Metadata = {
  title: "تفاصيل Render Job — MOVO Admin",
};

export default async function AdminRenderJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getRenderJob(id);
  if (!job) notFound();
  return <RenderJobDetailView job={job} />;
}
