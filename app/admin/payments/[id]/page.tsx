import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayment } from "@/lib/admin/services/billing";
import { PaymentDetailView } from "@/components/admin/payments/PaymentDetailView";

export const metadata: Metadata = {
  title: "تفاصيل الدفعة | Payment details — MOVO Admin",
};

export default async function AdminPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) notFound();
  return <PaymentDetailView payment={payment} />;
}
