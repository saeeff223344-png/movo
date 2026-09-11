import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailView } from "@/components/auth/VerifyEmailView";

export const metadata: Metadata = {
  title: "تأكيد البريد الإلكتروني | Verify email — MOVO",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailView />
    </Suspense>
  );
}
