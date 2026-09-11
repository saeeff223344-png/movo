import type { Metadata } from "next";
import { getFaqItems } from "@/lib/admin/services/site-content";
import { FaqView } from "@/components/admin/faq/FaqView";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة | FAQ — MOVO Admin",
};

export default async function AdminFaqPage() {
  const items = await getFaqItems();
  return <FaqView items={items} />;
}
