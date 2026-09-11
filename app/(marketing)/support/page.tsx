import type { Metadata } from "next";
import { SupportView } from "@/components/support/SupportView";

export const metadata: Metadata = {
  title: "المساعدة والدعم | Support — MOVO",
};

export default function SupportPage() {
  return <SupportView />;
}
