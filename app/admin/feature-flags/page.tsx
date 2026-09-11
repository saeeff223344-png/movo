import type { Metadata } from "next";
import { getFeatureFlags, getSystemSettings } from "@/lib/admin/services/system";
import { FeatureFlagsView } from "@/components/admin/feature-flags/FeatureFlagsView";

export const metadata: Metadata = {
  title: "Feature Flags — MOVO Admin",
};

export default async function AdminFeatureFlagsPage() {
  const [flags, settings] = await Promise.all([getFeatureFlags(), getSystemSettings()]);
  return <FeatureFlagsView flags={flags} killSwitches={settings.killSwitches} />;
}
