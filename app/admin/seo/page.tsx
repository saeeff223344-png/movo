import type { Metadata } from "next";
import { getSeoSettings } from "@/lib/admin/services/site-appearance";
import { SeoView } from "@/components/admin/seo/SeoView";

export const metadata: Metadata = {
  title: "SEO — MOVO Admin",
};

export default async function AdminSeoPage() {
  const settings = await getSeoSettings();
  return <SeoView settings={settings} />;
}
