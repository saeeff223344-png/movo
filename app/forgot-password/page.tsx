import type { Metadata } from "next";
import { ForgotPasswordView } from "@/components/auth/ForgotPasswordView";

export const metadata: Metadata = {
  title: "نسيت كلمة المرور | Forgot password — MOVO",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
