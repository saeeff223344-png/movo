import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the "middleware" file convention to "proxy" (same
// functionality — see node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
// This is the fast, optimistic session-refresh + redirect layer; the
// authoritative permission check still happens server-side in each
// layout/action via requireUser()/requireAdmin()/requirePermission()
// (lib/supabase/auth-helpers.ts) — proxy is not the sole auth boundary.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every route except static files and Next.js internals, so the
     * session cookie stays fresh everywhere — matches the official
     * @supabase/ssr recommendation.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
