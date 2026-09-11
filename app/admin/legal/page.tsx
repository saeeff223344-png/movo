import type { Metadata } from "next";
import { getLegalDocuments } from "@/lib/admin/services/site-content";
import { LegalView } from "@/components/admin/legal/LegalView";

export const metadata: Metadata = {
  title: "الشؤون القانونية | Legal — MOVO Admin",
};

export default async function AdminLegalPage() {
  const documents = await getLegalDocuments();
  return <LegalView documents={documents} />;
}
