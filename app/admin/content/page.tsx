import type { Metadata } from "next";
import { getAboutContent } from "@/lib/admin/services/site-content";
import { ContentView } from "@/components/admin/content/ContentView";

export const metadata: Metadata = {
  title: "المحتوى | Content — MOVO Admin",
};

export default async function AdminContentPage() {
  const content = await getAboutContent();
  return <ContentView content={content} />;
}
