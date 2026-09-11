import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAIJob } from "@/lib/admin/services/production";
import { AIJobDetailView } from "@/components/admin/ai-jobs/AIJobDetailView";

export const metadata: Metadata = {
  title: "تفاصيل AI Job — MOVO Admin",
};

export default async function AdminAIJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getAIJob(id);
  if (!job) notFound();
  return <AIJobDetailView job={job} />;
}
