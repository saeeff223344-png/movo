import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVideo } from "@/lib/admin/services/production";
import { VideoDetailView } from "@/components/admin/videos/VideoDetailView";

export const metadata: Metadata = {
  title: "تفاصيل الفيديو | Video details — MOVO Admin",
};

export default async function AdminVideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) notFound();
  return <VideoDetailView video={video} />;
}
