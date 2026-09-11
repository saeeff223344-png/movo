import type { Metadata } from "next";
import { TemplatesLibraryView } from "@/components/templates/TemplatesLibraryView";

export const metadata: Metadata = {
  title: "القوالب | Templates — MOVO",
};

export default function TemplatesPage() {
  return <TemplatesLibraryView />;
}
