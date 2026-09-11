import type { Metadata } from "next";
import { getTrials } from "@/lib/admin/services/customers";
import { TrialsView } from "@/components/admin/trials/TrialsView";

export const metadata: Metadata = {
  title: "التجارب المجانية | Trials — MOVO Admin",
};

export default async function AdminTrialsPage() {
  const trials = await getTrials();
  return <TrialsView trials={trials} />;
}
