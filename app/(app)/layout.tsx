import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { requireUser, getCurrentProfile } from "@/lib/supabase/auth-helpers";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  await requireUser();
  const profile = await getCurrentProfile();

  return (
    <>
      <AppHeader
        user={{
          fullName: profile?.full_name || "MOVO",
          email: profile?.email || "",
        }}
      />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">{children}</main>
    </>
  );
}
