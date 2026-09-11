import type { Metadata } from "next";
import { getUsage } from "@/lib/admin/services/production";
import { UsageView } from "@/components/admin/usage/UsageView";

export const metadata: Metadata = {
  title: "الاستخدام | Usage — MOVO Admin",
};

export default async function AdminUsagePage() {
  const usage = await getUsage();
  return <UsageView usage={usage} />;
}
