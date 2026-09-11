import type { Metadata } from "next";
import { getAdminAssets } from "@/lib/admin/services/site-appearance";
import { AssetsView } from "@/components/admin/assets/AssetsView";

export const metadata: Metadata = {
  title: "الملفات والوسائط | Assets — MOVO Admin",
};

export default async function AdminAssetsPage() {
  const assets = await getAdminAssets();
  return <AssetsView assets={assets} />;
}
