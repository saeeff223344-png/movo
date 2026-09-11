# Admin Roles & Permissions

Defined in `lib/admin/config/permissions.ts`.

## Roles

- **`user`** — the public MOVO app, no admin access.
- **`admin`** — access to whatever permissions a `super_admin` grants them.
- **`super_admin`** — implicitly holds every permission (`allPermissions()`);
  the permission matrix is hidden for their own account in the UI since it's
  always "all".

## Permission shape

A permission is `"<resource>.<action>"`, e.g. `"users.manage"`. Actions are
`read` and `manage`. Three resources are **read-only by design** — there is
nothing to "manage" on a report screen:

- `dashboard` (KPIs)
- `usage` (usage report)
- `audit` (activity log)

Every other resource in `PERMISSION_RESOURCES` has both `.read` and
`.manage`. `resourceHasManage(resource)` is the single source of truth the
Permission Matrix UI reads to decide whether to render a "Manage" checkbox.

## Full resource list

```
dashboard, users, admins, plans, subscriptions, codes, trials, payments,
projects, videos, ai_jobs, render_jobs, usage, finance, support,
notifications, announcements, homepage, content, examples, faq, developers,
pages, legal, navigation, footer, social, seo, localization, assets,
settings, feature_flags, audit, system_health
```

## Permission Matrix UI

`components/admin/ui/PermissionMatrix.tsx` groups these resources into 7
sections (`PERMISSION_GROUPS`) matching the sidebar groups — customers,
billing, production, business, site, appearance, system — with per-group
headers, a checkbox per read/manage cell, and **Select all** / **Clear all**.
Used both when creating an admin (`CreateAdminDrawer`) and editing one
(`AdminDetailView`).

## Current enforcement (mock phase)

There is no real auth session yet, so every `/admin/*` route is reachable
directly by URL — this is intentional for this review phase (see
`README.md` and the route-check section of the final report). The sidebar
(`lib/admin/config/navigation.ts`) already carries a `resource` per item and
`hasPermission()` exists as the enforcement primitive; it just isn't called
to hide/block anything yet because there's no session to check it against.

## What changes when Supabase is connected

- **Permission checks move server-side.** `hasPermission()` must be called
  in Server Components / Route Handlers using the authenticated admin's row
  from `admin_profiles` + `admin_permissions` (see `admin-data-model.md`),
  not just for hiding UI. The frontend check stays only as a UX nicety.
- **Passwords are never touched by this codebase.** Supabase Auth issues and
  resets credentials; `AdminAccount.requirePasswordChange` is a flag this
  app reads, not a password field — there is no password field in
  `AdminAccount` at all.
- **`super_admin` bypass must also move server-side** (e.g. a Postgres RLS
  policy keyed on role), not just `allPermissions()` in the client bundle.
