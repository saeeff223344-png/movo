import type { Metadata } from "next";
import { getEmailSettings } from "@/lib/admin/services/system";
import { EmailView } from "@/components/admin/email/EmailView";

export const metadata: Metadata = {
  title: "البريد الإلكتروني | Email — MOVO Admin",
};

export default async function AdminEmailPage() {
  const settings = await getEmailSettings();
  return <EmailView settings={settings} />;
}
