import type { Metadata } from "next";
import { getSocialLinks } from "@/lib/admin/services/site-appearance";
import { SocialView } from "@/components/admin/social/SocialView";

export const metadata: Metadata = {
  title: "السوشيال ميديا | Social — MOVO Admin",
};

export default async function AdminSocialPage() {
  const links = await getSocialLinks();
  return <SocialView links={links} />;
}
