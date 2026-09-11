import type { Metadata } from "next";
import { getAdmins } from "@/lib/admin/services/admins";
import { AdminsView } from "@/components/admin/admins/AdminsView";

export const metadata: Metadata = {
  title: "حسابات الإدارة | Admin accounts — MOVO Admin",
};

export default async function AdminAdminsPage() {
  const admins = await getAdmins();
  return <AdminsView admins={admins} />;
}
