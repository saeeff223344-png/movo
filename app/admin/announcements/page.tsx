import type { Metadata } from "next";
import { getAnnouncements } from "@/lib/admin/services/support";
import { AnnouncementsView } from "@/components/admin/announcements/AnnouncementsView";

export const metadata: Metadata = {
  title: "الإعلانات | Announcements — MOVO Admin",
};

export default async function AdminAnnouncementsPage() {
  const announcements = await getAnnouncements();
  return <AnnouncementsView announcements={announcements} />;
}
