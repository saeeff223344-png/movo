import type { Metadata } from "next";
import { getLocalizationSettings } from "@/lib/admin/services/system";
import { LocalizationView } from "@/components/admin/localization/LocalizationView";

export const metadata: Metadata = {
  title: "اللغات | Localization — MOVO Admin",
};

export default async function AdminLocalizationPage() {
  const settings = await getLocalizationSettings();
  return <LocalizationView settings={settings} />;
}
