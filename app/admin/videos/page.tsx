import type { Metadata } from "next";
import { getVideos } from "@/lib/admin/services/production";
import { VideosView } from "@/components/admin/videos/VideosView";

export const metadata: Metadata = {
  title: "الفيديوهات | Videos — MOVO Admin",
};

export default async function AdminVideosPage() {
  const videos = await getVideos();
  return <VideosView videos={videos} />;
}
