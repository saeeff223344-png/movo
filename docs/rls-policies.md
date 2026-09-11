# Row Level Security Policies

MOVO's authorization model is enforced **in Postgres**, not just in
application code — every table that holds user or business data has
`ENABLE ROW LEVEL SECURITY` and explicit policies. Server-side helpers in
`lib/supabase/auth-helpers.ts` (`requireUser`, `requireAdmin`,
`requirePermission`, etc.) give fast UX-level redirects, but they are a
convenience layer, not the security boundary — RLS is, since the anon and
authenticated Supabase keys are usable directly by a browser and must be
safe on their own.

## RLS is necessary but not sufficient — GRANTs come first

Before Postgres ever evaluates an RLS policy, it checks whether the calling
role has the base table-level `GRANT` for that command (`SELECT`/`INSERT`/
`UPDATE`/`DELETE`) at all. Supabase projects normally get this for free —
every table created through the SQL Editor is auto-granted to `anon`,
`authenticated`, and `service_role` via a default-privilege rule scoped to
the `postgres` role. **That did not happen for this project**: testing
directly against the live database (see `docs/supabase-setup.md`) showed
every table from `001`-`009` returning Postgres error `42501`
("permission denied for table x", with the hint literally suggesting the
missing `GRANT`) for `anon`, `authenticated`, *and* `service_role` alike —
RLS was never reached.

`010_grants.sql` fixes this with an explicit, standard baseline: `anon`
gets `SELECT`, `authenticated`/`service_role` get
`SELECT/INSERT/UPDATE/DELETE`, on every table, plus matching
`ALTER DEFAULT PRIVILEGES` so tables added by future migrations inherit the
same grants automatically. **This does not weaken anything below** — RLS
policies (documented below) remain the actual per-row gate. A `GRANT`
without a matching `USING`/`WITH CHECK` policy for that command still
returns/affects zero rows (e.g. `audit_logs` has no `INSERT` policy for any
role, so the blanket `INSERT` grant there is inert in practice — see
"Notable deliberate restrictions" below). Run `010_grants.sql` even on a
project where `001`-`007` are already applied.

## The three authorization primitives

Defined in `002_admin_roles_permissions.sql`, all `SECURITY DEFINER` so
they can read `admin_profiles`/`admin_permissions` regardless of the
calling user's own row-level access:

- **`is_admin()`** — true if `auth.uid()` has an `admin_profiles` row with
  `status = 'active'` (either role).
- **`is_super_admin()`** — true if that row's `role = 'super_admin'`.
- **`has_permission(permission text, check_uid uuid default auth.uid())`**
  — true if `is_super_admin()` for that uid, OR the uid has a matching row
  in `admin_permissions`. Every admin-manage policy calls this rather than
  duplicating the admin/super_admin check inline.

## Standard pattern per table

Most tables follow one of these shapes:

1. **Owner-only** (`projects`, `videos`, `project_assets`, ...):
   ```sql
   using (auth.uid() = owner_id)
   with check (auth.uid() = owner_id)
   ```
   plus a separate admin policy: `using (has_permission('projects.manage'))`
   or `.read` for read-only admin visibility.

2. **Public marketing content** (`homepage_settings`, `faq_items`,
   `examples`, `navigation_items`, `footer_settings`, `social_links`, ...):
   ```sql
   for select to anon, authenticated
   using (enabled = true)  -- or published / active, per table
   ```
   plus an admin `.manage` policy for writes. These are intentionally
   world-readable — they're what renders the public site.

3. **Admin-only, no public access at all** (`system_settings`,
   `email_templates`, `email_settings`, `assets`, `admin_notes`,
   `audit_logs`): no `anon`/`authenticated`-general policy exists; only
   `has_permission('<resource>.read'|'manage')` policies.

4. **Self-row + admin** (`profiles`, `trial_usage`, `subscriptions`,
   `payments`): the user can `select`/limited-`update` their own row;
   admins with the matching permission get broader access.

## Notable deliberate restrictions

- **`activation_codes` has no general SELECT policy for regular users at
  all.** A user redeems a code exclusively through the
  `redeem_activation_code()` RPC (`SECURITY DEFINER`, runs with elevated
  rights internally), never by querying the table directly — so a code's
  existence/status can't be enumerated by guessing.
- **`admin_notes` is never visible to the entity it's about.** A note
  admins write about a user has RLS that only matches
  `has_permission('users.read')`-holding admins — the `auth.uid() = user`
  self-select policy on `admin_notes` does not exist, by design.
- **`audit_logs` has zero INSERT policies for any role**, including
  admins. The only way a row is written is from inside `SECURITY DEFINER`
  functions (the RPCs in `007`) and a couple of server actions using the
  privileged client — so even a compromised admin session can't forge or
  suppress audit history via a direct table write.
- **`account_status` on `profiles` cannot be self-changed**, even though
  the general self-update RLS policy technically allows updating the row.
  Postgres column-level `GRANT`s are role-wide, not policy-specific, so
  restricting the grant would have blocked admins too or not blocked users
  at all depending on which policy matched. Instead,
  `guard_profile_status_change()` (`BEFORE UPDATE` trigger) explicitly
  raises an exception if `account_status` is changing and the caller
  doesn't have `users.manage`. This was caught and fixed during
  development — see the note in `database-schema.md`.
- **`navigation_items.href` has a `CHECK` constraint**
  (`href ~ '^(/|#|https://)'`) — defense in depth against a compromised
  or careless admin session storing a `javascript:` URL that would XSS
  every visitor of the public nav.

## RLS is not the only layer

Every admin route/action also calls `requirePermission()` /
`requireAdmin()` server-side before doing anything (see `admin-auth.md`),
and the admin UI hides actions the current admin can't perform. RLS is the
backstop that holds even if a UI check or a server action is ever wrong or
bypassed — not the only check performed.
