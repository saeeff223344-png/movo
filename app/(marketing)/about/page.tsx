import type { Metadata } from "next";
import { AboutHero } from "@/components/about/AboutHero";
import { MissionSection } from "@/components/about/MissionSection";
import { OfferSection } from "@/components/about/OfferSection";
import { ValuesSection } from "@/components/about/ValuesSection";
import { AboutCta } from "@/components/about/AboutCta";

export const metadata: Metadata = {
  title: "عن MOVO | About MOVO",
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <MissionSection />
      <OfferSection />
      <ValuesSection />
      <AboutCta />
    </>
  );
}
