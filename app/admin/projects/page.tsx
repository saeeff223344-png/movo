import type { Metadata } from "next";
import { getProjects } from "@/lib/admin/services/production";
import { ProjectsView } from "@/components/admin/projects/ProjectsView";

export const metadata: Metadata = {
  title: "المشاريع | Projects — MOVO Admin",
};

export default async function AdminProjectsPage() {
  const projects = await getProjects();
  return <ProjectsView projects={projects} />;
}
