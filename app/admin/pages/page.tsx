import type { Metadata } from "next";
import { getPages } from "@/lib/admin/services/site-content";
import { PagesView } from "@/components/admin/pages/PagesView";

export const metadata: Metadata = {
  title: "الصفحات | Pages — MOVO Admin",
};

export default async function AdminPagesPage() {
  const pages = await getPages();
  return <PagesView pages={pages} />;
}
