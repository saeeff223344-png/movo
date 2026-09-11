import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Browser-side Supabase client — safe to import from any Client Component.
 * Uses only the public URL + anon key (both NEXT_PUBLIC_, both fine to ship
 * to the browser; RLS is what actually protects the data).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
