import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";
import { getCurrentSubscriptionStatus } from "@/lib/supabase/subscription-status";
import { getCurrentProfile } from "@/lib/supabase/auth-helpers";

export const metadata: Metadata = {
  title: "الإعدادات | Settings — MOVO",
};

export default async function SettingsPage() {
  const [subscription, profile] = await Promise.all([getCurrentSubscriptionStatus(), getCurrentProfile()]);
  return (
    <SettingsView
      subscription={subscription}
      profile={{ fullName: profile?.full_name ?? "", email: profile?.email ?? "" }}
    />
  );
}
