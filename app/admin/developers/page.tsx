import type { Metadata } from "next";
import { getDevelopers, getDeveloperPageSettings } from "@/lib/admin/services/site-content";
import { DevelopersView } from "@/components/admin/developers/DevelopersView";

export const metadata: Metadata = {
  title: "المطورون | Developers — MOVO Admin",
};

export default async function AdminDevelopersPage() {
  const [developers, pageSettings] = await Promise.all([getDevelopers(), getDeveloperPageSettings()]);
  return <DevelopersView developers={developers} pageSettings={pageSettings} />;
}
