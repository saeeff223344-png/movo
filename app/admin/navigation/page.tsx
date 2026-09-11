import type { Metadata } from "next";
import { getNavigation } from "@/lib/admin/services/site-appearance";
import { NavigationView } from "@/components/admin/navigation/NavigationView";

export const metadata: Metadata = {
  title: "التنقل | Navigation — MOVO Admin",
};

export default async function AdminNavigationPage() {
  const navigation = await getNavigation();
  return <NavigationView navigation={navigation} />;
}
