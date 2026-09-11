import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject, getProjectRelated } from "@/lib/admin/services/production";
import { ProjectDetailView } from "@/components/admin/projects/ProjectDetailView";

export const metadata: Metadata = {
  title: "تفاصيل المشروع | Project details — MOVO Admin",
};

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const related = await getProjectRelated(id);
  return <ProjectDetailView project={project} aiJobs={related.aiJobs} renderJobs={related.renderJobs} video={related.video} />;
}
