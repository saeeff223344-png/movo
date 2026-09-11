import type { Metadata } from "next";
import { getAuditLog } from "@/lib/admin/services/system";
import { ActivityView } from "@/components/admin/activity/ActivityView";

export const metadata: Metadata = {
  title: "سجل النشاط | Activity — MOVO Admin",
};

export default async function AdminActivityPage() {
  const entries = await getAuditLog();
  return <ActivityView entries={entries} />;
}
