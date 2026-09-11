import type { Metadata } from "next";
import { getSystemSettings } from "@/lib/admin/services/system";
import { getBrandingSettings } from "@/lib/admin/services/site-appearance";
import { SystemSettingsView } from "@/components/admin/settings/SystemSettingsView";

export const metadata: Metadata = {
  title: "الإعدادات | Settings — MOVO Admin",
};

export default async function AdminSettingsPage() {
  const [settings, branding] = await Promise.all([getSystemSettings(), getBrandingSettings()]);
  return <SystemSettingsView settings={settings} branding={branding} />;
}
