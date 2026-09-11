import type { Metadata } from "next";
import { DevelopersHero } from "@/components/developers/DevelopersHero";
import { TeamGrid } from "@/components/developers/TeamGrid";
import { JoinSection } from "@/components/developers/JoinSection";

export const metadata: Metadata = {
  title: "المطورون | Developers — MOVO",
};

export default function DevelopersPage() {
  return (
    <div className="space-y-14 py-20">
      <DevelopersHero />
      <TeamGrid />
      <JoinSection />
    </div>
  );
}
