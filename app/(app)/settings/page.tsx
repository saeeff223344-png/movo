import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";
import { getCurrentSubscriptionStatus } from "@/lib/supabase/subscription-status";

export const metadata: Metadata = {
  title: "الإعدادات | Settings — MOVO",
};

export default async function SettingsPage() {
  const subscription = await getCurrentSubscriptionStatus();
  return <SettingsView subscription={subscription} />;
}
