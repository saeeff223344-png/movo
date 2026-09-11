import type { Metadata } from "next";
import { getActivationCodes, getPlans } from "@/lib/admin/services/billing";
import { ActivationCodesView } from "@/components/admin/codes/ActivationCodesView";

export const metadata: Metadata = {
  title: "أكواد التفعيل | Activation codes — MOVO Admin",
};

export default async function AdminActivationCodesPage() {
  const [codes, plans] = await Promise.all([getActivationCodes(), getPlans()]);
  return <ActivationCodesView codes={codes} plans={plans} />;
}
