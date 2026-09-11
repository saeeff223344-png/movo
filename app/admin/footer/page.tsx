import type { Metadata } from "next";
import { getFooterSettings } from "@/lib/admin/services/site-appearance";
import { FooterView } from "@/components/admin/footer/FooterView";

export const metadata: Metadata = {
  title: "الفوتر | Footer — MOVO Admin",
};

export default async function AdminFooterPage() {
  const settings = await getFooterSettings();
  return <FooterView settings={settings} />;
}
