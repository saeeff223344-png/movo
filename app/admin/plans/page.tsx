import type { Metadata } from "next";
import { getPlans } from "@/lib/admin/services/billing";
import { PlansView } from "@/components/admin/plans/PlansView";

export const metadata: Metadata = {
  title: "الباقات | Plans — MOVO Admin",
};

export default async function AdminPlansPage() {
  const plans = await getPlans();
  return <PlansView plans={plans} />;
}
