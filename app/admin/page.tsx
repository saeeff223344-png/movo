import type { Metadata } from "next";
import { getAdminDashboard } from "@/lib/admin/services/dashboard";
import { DashboardView } from "@/components/admin/dashboard/DashboardView";

export const metadata: Metadata = {
  title: "لوحة تحكم الإدارة | Admin Dashboard — MOVO",
};

export default async function AdminDashboardPage() {
  const data = await getAdminDashboard();
  return <DashboardView data={data} />;
}
