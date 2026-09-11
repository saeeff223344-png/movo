import type { Metadata } from "next";
import { getNotifications } from "@/lib/admin/services/support";
import { NotificationsView } from "@/components/admin/notifications/NotificationsView";

export const metadata: Metadata = {
  title: "الإشعارات | Notifications — MOVO Admin",
};

export default async function AdminNotificationsPage() {
  const notifications = await getNotifications();
  return <NotificationsView notifications={notifications} />;
}
