import type { Metadata } from "next";
import { getPayments } from "@/lib/admin/services/billing";
import { PaymentsView } from "@/components/admin/payments/PaymentsView";

export const metadata: Metadata = {
  title: "المدفوعات | Payments — MOVO Admin",
};

export default async function AdminPaymentsPage() {
  const payments = await getPayments();
  return <PaymentsView payments={payments} />;
}
