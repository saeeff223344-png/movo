import type { Metadata } from "next";
import { getFinanceSummary, getCostConfiguration } from "@/lib/admin/services/finance";
import { FinanceView } from "@/components/admin/finance/FinanceView";

export const metadata: Metadata = {
  title: "المالية والأرباح | Finance — MOVO Admin",
};

export default async function AdminFinancePage() {
  const [summary, costConfig] = await Promise.all([getFinanceSummary(), getCostConfiguration()]);
  return <FinanceView summary={summary} costConfig={costConfig} />;
}
