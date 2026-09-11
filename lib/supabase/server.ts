import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Server-side Supabase client for Server Components, Server Actions and
 * Route Handlers — reads the session from request cookies via next/headers.
 *
 * Reading cookies makes the calling route dynamic automatically (Next.js
 * opts it out of static generation), which is exactly what we want: pages
 * that depend on the visitor's session must never be prerendered at build
 * time with no session available.
 *
 * Must be created fresh per request (cookies() is request-scoped) — never
 * cache/reuse an instance across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component (not a Server Action/Route
            // Handler) — cookies() is read-only there. Session refresh for
            // that case is handled by the root middleware instead.
          }
        },
      },
    },
  );
}
