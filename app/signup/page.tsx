import type { Metadata } from "next";
import { SignupView } from "@/components/auth/SignupView";

export const metadata: Metadata = {
  title: "إنشاء حساب | Sign up — MOVO",
};

export default function SignupPage() {
  return <SignupView />;
}
