import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlan } from "@/lib/admin/services/billing";
import { getCostConfiguration } from "@/lib/admin/services/finance";
import { PlanDetailView } from "@/components/admin/plans/PlanDetailView";

export const metadata: Metadata = {
  title: "تفاصيل الباقة | Plan details — MOVO Admin",
};

export default async function AdminPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [plan, costConfig] = await Promise.all([getPlan(id), getCostConfiguration()]);
  if (!plan) notFound();
  return <PlanDetailView plan={plan} costConfig={costConfig} />;
}
