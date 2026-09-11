import type { Metadata } from "next";
import { getSystemHealth } from "@/lib/admin/services/system";
import { SystemHealthView } from "@/components/admin/system-health/SystemHealthView";

export const metadata: Metadata = {
  title: "صحة النظام | System Health — MOVO Admin",
};

export default async function AdminSystemHealthPage() {
  const services = await getSystemHealth();
  return <SystemHealthView services={services} />;
}
