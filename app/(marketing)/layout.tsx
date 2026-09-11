import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCurrentProfile } from "@/lib/supabase/auth-helpers";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  const user = profile ? { fullName: profile.full_name || "MOVO", email: profile.email || "" } : null;

  return (
    <>
      <Navbar user={user} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
