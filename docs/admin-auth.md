# Admin Authentication & Permissions

How access to `/admin/*` is gated, how new admin accounts get created, and
— the one manual step this whole system depends on — how the very first
`super_admin` comes to exist.

## Roles

- **`user`** — no `admin_profiles` row at all. Default for everyone.
- **`admin`** — has an `admin_profiles` row with `role = 'admin'`. Access
  is limited to whatever's in their `admin_permissions` rows.
- **`super_admin`** — has an `admin_profiles` row with
  `role = 'super_admin'`. `has_permission()` (see `rls-policies.md`)
  short-circuits true for every permission, and `is_super_admin()` gates a
  few super-admin-only actions directly (creating other admins, changing
  roles).

## Permission model

34 resources × `read`/`manage` actions (see `docs/admin-permissions.md`
from the earlier mock-architecture phase for the full resource list — the
shape hasn't changed, only the enforcement). A permission string is
`"<resource>.<action>"`, e.g. `"users.manage"`, `"payments.read"`.
`manage` implies `read` by convention in the UI layer, but the database
function checks the exact permission requested — a page requiring
`.manage` for a write action must check for `.manage` specifically, not
just any permission on that resource.

## Enforcement layers (outer to inner)

1. **`proxy.ts`** — redirects unauthenticated requests to `/admin/*` to
   `/login`; redirects authenticated non-admins to `/`. Fast, UX-only.
2. **`app/admin/layout.tsx`** — calls `await requireAdmin()`, which
   redirects to `/` if `is_admin()` is false. Every admin page is a child
   of this layout, so this runs on every admin request server-side.
3. **Per-page/action `requirePermission(resource, action)`** — used inside
   specific pages and Server Actions where a page maps to a specific
   resource (e.g. the users page calls
   `requirePermission("users", "read")`; `suspendUserAction` calls
   `requirePermission("users", "manage")`). Redirects to
   `/admin?denied=1` if the check fails.
4. **RLS** — the actual database-level backstop; see `rls-policies.md`.
   Even if every check above were somehow bypassed, the Postgres policies
   still apply.

All four helpers live in `lib/supabase/auth-helpers.ts`:
`getSession()`, `getCurrentProfile()`, `getCurrentAdminProfile()`,
`requireUser()`, `requireAdmin()`, `requireSuperAdmin()`,
`requirePermission()`.

## Creating admin accounts (super_admin only)

`components/admin/admins/CreateAdminDrawer.tsx` →
`lib/admin/actions/create-admin.ts` (`"use server"`, `createAdmin()`):

1. Re-checks `has_permission('admins.manage')` **using the caller's own
   session** (the regular server client, not the service-role client) —
   this is deliberate: the check must be attributed to whoever is actually
   calling the action, not silently pass because a privileged client is
   involved later in the function.
2. Uses `createAdminClient()` (service-role, `server-only`) to call
   `supabase.auth.admin.createUser({ email, password: temporaryPassword, email_confirm: true, user_metadata: { full_name } })`.
   This is the **only** path in the entire app that creates a Supabase
   Auth user without that person going through `/signup` themselves.
3. Inserts the `admin_profiles` row. If that insert fails, rolls back by
   deleting the just-created Auth user
   (`adminClient.auth.admin.deleteUser(newUserId)`) — an admin_profiles
   row and an Auth user are meant to be created atomically from the
   caller's point of view, and Auth users can't be created inside a SQL
   transaction, so this is a manual compensating action instead.
4. Inserts `admin_permissions` rows for the granted permissions (skipped
   entirely for `role = 'super_admin'`, which doesn't need explicit rows).
5. Inserts an `audit_logs` row (`action: "admin.created"`).

**The temporary password is sent only to the `auth.admin.createUser()`
call.** It is never written to any application table, never logged, and
never returned to the caller in a way that persists — the UI is expected
to show/copy it once at creation time and rely on
`require_password_change` to force a change on first login (that forcing
UI itself is not yet built — see the report's outstanding items).

## Bootstrapping the first super_admin

There is **no UI, no API route, and no Server Action anywhere in this
codebase that can create a `super_admin`**, on purpose — every existing
path requires `admins.manage`, which only an existing super_admin can
grant. The first one has to be created by hand, once, directly against the
database. Do this only once, right after a real Supabase project exists:

1. Go through the normal `/signup` flow in the running app and create a
   regular account with the email you want to be the first super_admin.
   Confirm the email (click the confirmation link).
2. In the Supabase Dashboard, go to **Authentication → Users**, find that
   user, and copy their **User UID**.
3. Go to **SQL Editor** and run:

   ```sql
   insert into public.admin_profiles (user_id, role, status)
   values ('<paste-the-user-uid-here>', 'super_admin', 'active');
   ```

4. Sign out and back in (or just navigate to `/admin`) — that account now
   passes `is_admin()`/`is_super_admin()` and can reach the admin panel
   and create further admins normally through the UI from then on.

This procedure is intentionally manual and undocumented anywhere public
(no link to it from the app itself) — it is the one place in the system
where trust is rooted outside the application, which is the correct place
for that root to live.
