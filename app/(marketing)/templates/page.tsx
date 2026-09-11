import type { Metadata } from "next";
import { TemplatesLibraryView } from "@/components/templates/TemplatesLibraryView";
import { getPublicExamples } from "@/lib/supabase/examples";

export const metadata: Metadata = {
  title: "القوالب | Templates — MOVO",
};

export default async function TemplatesPage() {
  const examples = await getPublicExamples();
  return <TemplatesLibraryView examples={examples} />;
}
