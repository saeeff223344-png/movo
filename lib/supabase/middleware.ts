import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

const PROTECTED_USER_PREFIXES = ["/dashboard", "/create", "/settings", "/subscription"];

/**
 * Refreshes the Supabase session cookie on every request (required by
 * @supabase/ssr — without this, sessions silently expire) and enforces
 * route protection server-side:
 *   - unauthenticated -> /admin/* or a protected user route redirects to /login
 *   - authenticated non-admin -> /admin/* redirects home
 *   - fine-grained per-resource permission checks still happen in each
 *     admin page/action via requirePermission() (see auth-helpers.ts) —
 *     this layer only answers "logged in?" and "is an admin at all?".
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // IMPORTANT: do not remove — this call is what actually refreshes the
  // token and must run before any redirect logic below.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedUserRoute = PROTECTED_USER_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && (isAdminRoute || isProtectedUserRoute)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAdminRoute) {
    // Goes through the same is_admin() SECURITY DEFINER RPC used by
    // requireAdmin() (auth-helpers.ts) rather than a direct table SELECT —
    // a direct SELECT here would depend on admin_profiles' RLS self-read
    // policy resolving correctly at the proxy layer, which is an extra,
    // unnecessary point of failure this check doesn't need: the RPC is the
    // single source of truth for "is this uid an active admin" everywhere
    // else in the app, so this layer should ask it the same question the
    // same way instead of re-deriving the answer from a raw row read.
    const { data: isAdmin, error } = await supabase.rpc("is_admin", { check_uid: user.id });

    if (error) {
      console.error("[proxy] is_admin() RPC failed:", error.message);
    }

    if (!isAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
