# Supabase Setup

This documents how to connect MOVO to a real Supabase project. The
application code, SQL migrations, and TypeScript types described here are
already written and committed — **no live Supabase project is connected
yet**. Nothing in this repo invents or assumes project credentials.

## 1. Create a Supabase project

1. Go to https://supabase.com/dashboard and create a new project (any
   region; note the database password you set — you won't need it for the
   app itself, only if you connect via `psql` directly).
2. Wait for provisioning to finish.

## 2. Collect the three environment variables

In the Supabase Dashboard: **Project Settings → API**.

| Variable | Where to find it | Exposed to browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" | Yes — safe, public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "Project API keys" → `anon` `public` | Yes — safe, protected by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | "Project API keys" → `service_role` `secret` | **No — server-only, bypasses RLS** |

Copy `.env.example` to `.env.local` and fill these three in:

```bash
cp .env.example .env.local
```

`.env.local` is already git-ignored. Never commit real keys. Never prefix
the service role key with `NEXT_PUBLIC_` — `lib/supabase/admin.ts` reads it
via `server-only` and it is never sent to the client bundle.

## 3. Run the migrations

The schema lives in `supabase/migrations/001` through `010`, in order.
Two ways to apply them:

**Option A — Supabase CLI (recommended):**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Option B — SQL Editor (Dashboard):**

Open **SQL Editor** in the Dashboard and run each file in
`supabase/migrations/` in numeric order (001 → 010), one at a time. Wait
for each to succeed before running the next — later files reference
tables/functions created earlier.

**`010_grants.sql` is not optional — run it even if 001-007 are already
applied.** Testing directly against a live project surfaced a real gap:
tables created via the SQL Editor did not automatically receive the
`anon`/`authenticated`/`service_role` table-level `GRANT`s Supabase usually
sets up automatically. Without it, every query fails with Postgres error
`42501` ("permission denied for table x") **before RLS is ever evaluated**
— RLS policies alone are not enough; the role must also be allowed to
attempt the command at all. `010_grants.sql` grants the standard baseline
(`anon`: `SELECT`; `authenticated`/`service_role`: `SELECT/INSERT/UPDATE/
DELETE`) and sets matching default privileges for any table added later —
RLS stays the real per-row gate exactly as before, this only unblocks the
role from reaching it. See `docs/rls-policies.md` for the full explanation.

Migrations are written to be safe to re-run (seed data uses
`ON CONFLICT DO NOTHING`; DDL uses `IF NOT EXISTS` where applicable), but
running them out of order will fail on missing dependencies.

## 4. Regenerate the TypeScript types (optional but recommended)

`lib/supabase/database.types.ts` is currently **hand-written** to mirror
the SQL schema exactly (see the note at the top of that file). Once a
project is linked, regenerate it from the live schema to catch any drift:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > lib/supabase/database.types.ts
```

If you do this, re-add the `Relationships: [];` field convention described
in that file's header comment if the generated types differ from the
`Table<Row, Insert, Update>` helper currently in use — see
`docs/database-schema.md` for why that field matters.

## 5. Bootstrap the first super_admin

There is deliberately **no public endpoint or UI that can create a
super_admin** — every admin-creation path in the app (including the "Create
Admin" drawer) requires an existing `admins.manage` permission, which only
a super_admin can grant. The very first super_admin must be created
manually. Full step-by-step procedure: **`docs/admin-auth.md` → "Bootstrapping
the first super_admin"**.

Summary: sign up a normal account through the app's `/signup` page first,
then run one `insert` statement against `admin_profiles` for that user's
`id` via the SQL Editor.

## 6. Storage buckets

Six buckets are created by `supabase/migrations/006_storage_rls.sql`:
`avatars`, `project-assets`, `videos`, `developer-images`, `site-assets`,
`payment-receipts`. RLS policies on `storage.objects` scope access by
folder-per-user path ownership (`<user_id>/...`) for the private buckets,
and by admin permission for admin-managed ones. No application code
currently calls `supabase.storage.from(...).upload()` yet — the buckets and
policies exist and are ready to be wired into upload UI in a follow-up
pass.

## 7. Verifying the connection

Once `.env.local` is filled in and migrations are applied:

```bash
npm run dev
```

Visit `/signup`, create an account, confirm the email flow (Supabase's
default email templates work out of the box in a new project — see
`docs/auth-flow.md` for the exact flow and redirect URLs). Then follow the
bootstrap procedure above to promote that account to super_admin and sign
in at `/login` to reach `/admin`.

## 8. What still needs live credentials to verify

Everything in this repo was built and verified as far as possible without
a live project: `npm run typecheck`, `npm run lint`, and `npm run build`
all pass with zero Supabase credentials configured (every route that reads
a session is correctly marked dynamic — see `docs/database-schema.md` for
why build never makes a live network call). What has **not** been
exercised end-to-end (no project existed to test against) is anything that
requires an actual round trip: sign up / login / email confirmation,
activation code redemption, admin account creation, and every converted
service query. Test these manually after step 7.
