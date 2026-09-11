import type { Metadata } from "next";
import { SupportView } from "@/components/support/SupportView";
import { getMySupportRequests } from "@/lib/supabase/support";

export const metadata: Metadata = {
  title: "المساعدة والدعم | Support — MOVO",
};

export default async function SupportPage() {
  const requests = await getMySupportRequests();
  return <SupportView requests={requests} />;
}
