import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role Supabase client — bypasses RLS entirely. `import "server-only"`
 * makes any accidental import from a Client Component a build error, on top
 * of SUPABASE_SERVICE_ROLE_KEY simply not existing in the browser bundle
 * (it deliberately has no NEXT_PUBLIC_ prefix).
 *
 * Use ONLY for the handful of operations that must bypass RLS by design —
 * currently just admin-account creation via the Supabase Auth Admin API
 * (lib/admin/actions/create-admin.ts). Every other write should go through
 * a normal authenticated client + RLS policy, or one of the SECURITY
 * DEFINER RPCs in supabase/migrations/007_functions_indexes_seed.sql.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL) is not set — see .env.example.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
