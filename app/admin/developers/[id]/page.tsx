import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDeveloper } from "@/lib/admin/services/site-content";
import { DeveloperDetailView } from "@/components/admin/developers/DeveloperDetailView";

export const metadata: Metadata = {
  title: "تفاصيل المطور | Developer details — MOVO Admin",
};

export default async function AdminDeveloperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const developer = await getDeveloper(id);
  if (!developer) notFound();
  return <DeveloperDetailView developer={developer} />;
}
