import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdmin } from "@/lib/admin/services/admins";
import { getCurrentAdminProfile } from "@/lib/supabase/auth-helpers";
import { AdminDetailView } from "@/components/admin/admins/AdminDetailView";

export const metadata: Metadata = {
  title: "تفاصيل حساب إداري | Admin details — MOVO Admin",
};

export default async function AdminAdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [admin, currentAdmin] = await Promise.all([getAdmin(id), getCurrentAdminProfile()]);
  if (!admin) notFound();
  return <AdminDetailView admin={admin} currentAdminId={currentAdmin?.user_id ?? null} />;
}
