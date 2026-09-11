import type { Metadata } from "next";
import { getExamples } from "@/lib/admin/services/site-content";
import { ExamplesView } from "@/components/admin/examples/ExamplesView";

export const metadata: Metadata = {
  title: "الأمثلة | Examples — MOVO Admin",
};

export default async function AdminExamplesPage() {
  const examples = await getExamples();
  return <ExamplesView examples={examples} />;
}
