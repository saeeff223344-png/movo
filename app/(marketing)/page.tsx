import { Hero } from "@/components/home/Hero";
import { ValueStatement } from "@/components/home/ValueStatement";
import { Examples } from "@/components/home/Examples";
import { HowItWorks } from "@/components/home/HowItWorks";
import { VideoTypes } from "@/components/home/VideoTypes";
import { Features } from "@/components/home/Features";
import { Quality } from "@/components/home/Quality";
import { TrialTeaser } from "@/components/home/TrialTeaser";
import { SubscriptionTeaser } from "@/components/home/SubscriptionTeaser";
import { FinalCta } from "@/components/home/FinalCta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ValueStatement />
      <Examples />
      <HowItWorks />
      <VideoTypes />
      <Features />
      <Quality />
      <TrialTeaser />
      <SubscriptionTeaser />
      <FinalCta />
    </>
  );
}
