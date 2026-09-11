import type { Metadata } from "next";
import { getHomepageConfig } from "@/lib/admin/services/site-content";
import { HomepageView } from "@/components/admin/homepage/HomepageView";

export const metadata: Metadata = {
  title: "الصفحة الرئيسية | Homepage — MOVO Admin",
};

export default async function AdminHomepagePage() {
  const config = await getHomepageConfig();
  return <HomepageView config={config} />;
}
