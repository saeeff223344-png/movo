import type { Metadata } from "next";
import { ResetPasswordView } from "@/components/auth/ResetPasswordView";

export const metadata: Metadata = {
  title: "إعادة تعيين كلمة المرور | Reset password — MOVO",
};

export default function ResetPasswordPage() {
  return <ResetPasswordView />;
}
