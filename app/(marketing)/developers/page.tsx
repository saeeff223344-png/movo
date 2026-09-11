import type { Metadata } from "next";
import { DevelopersHero } from "@/components/developers/DevelopersHero";
import { TeamGrid } from "@/components/developers/TeamGrid";
import { JoinSection } from "@/components/developers/JoinSection";
import { getPublicDevelopers, getPublicDeveloperPageSettings } from "@/lib/supabase/developers";
import { getSupportContact } from "@/lib/supabase/contact";

export const metadata: Metadata = {
  title: "المطورون | Developers — MOVO",
};

export default async function DevelopersPage() {
  const [developers, pageSettings, contact] = await Promise.all([
    getPublicDevelopers(),
    getPublicDeveloperPageSettings(),
    getSupportContact(),
  ]);

  return (
    <div className="space-y-14 py-20">
      <DevelopersHero pageSettings={pageSettings} />
      <TeamGrid developers={developers} />
      <JoinSection contact={contact} />
    </div>
  );
}
