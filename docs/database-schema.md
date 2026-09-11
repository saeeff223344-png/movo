# Database Schema

The real, applied-on-a-live-project schema for MOVO, as written in
`supabase/migrations/001` through `010`. This supersedes the earlier
conceptual sketch in `docs/admin-data-model.md` (kept for history; this
file is the source of truth now that SQL actually exists).

## Migration files

| File | Contents |
|---|---|
| `001_core_auth_profiles.sql` | `profiles` (extends `auth.users`), `set_updated_at()` trigger, `handle_new_user()` auto-provisioning trigger, `guard_profile_status_change()` trigger |
| `002_admin_roles_permissions.sql` | `admin_profiles`, `admin_permissions`, `is_admin()`, `is_super_admin()`, `has_permission()` |
| `003_subscriptions.sql` | `subscription_plans`, `activation_codes`, `subscriptions`, `trial_usage`, `payments` |
| `004_projects_video_jobs.sql` | `projects`, `project_assets`, `project_revisions`, `videos`, `ai_jobs`, `render_jobs`, `usage_events` |
| `005_support_content_settings.sql` | support/CMS/settings tables (largest migration — see below) |
| `006_storage_rls.sql` | storage buckets + `storage.objects` RLS policies |
| `007_functions_indexes_seed.sql` | atomic RPCs, indexes, idempotent seed data |
| `008_settings_gaps.sql` | `branding_settings`, `about_page_settings`, `localization_settings`, `finance_cost_config` — four admin-manageable settings screens that had no table in 001-007 (see "Admin panel schema gaps" below) |
| `009_production_gaps.sql` | `ai_jobs.input_summary`, `render_jobs.server` — two columns the AI/render job detail views need, additive `ALTER TABLE` only |
| `010_grants.sql` | **Required.** Explicit `anon`/`authenticated`/`service_role` table grants — see `docs/rls-policies.md` "RLS is necessary but not sufficient" for why this exists and why it must be run even on a project where 001-007 are already applied |

## Admin panel schema gaps found while converting Mock → Supabase

Four admin screens (branding, the About page editor, localization, and the
finance cost-assumptions form) referenced settings with no backing table in
001-007. Rather than overload an existing table or invent a parallel one,
each got its own singleton-row table (`008_settings_gaps.sql`), following
the exact pattern already established by `homepage_settings`/
`seo_settings`/`developer_page_settings`. Two further columns
(`ai_jobs.input_summary`, `render_jobs.server`) were added in
`009_production_gaps.sql` for fields the AI/render job detail pages expect
but that 004 didn't include — both are additive `ALTER TABLE ADD COLUMN`
statements, nothing removed or renamed.

## Identity & authorization

- **`profiles`** — one row per `auth.users` row (`id` is the FK and PK,
  1:1). `full_name`, `email` (a snapshot, not the source of truth —
  `auth.users.email` is), `avatar_url`, `preferred_language`, `theme`,
  `account_status`, timestamps. Auto-created by the `handle_new_user()`
  trigger on `auth.users` insert. `account_status` can only be changed by
  an admin with `users.manage` — enforced by the `guard_profile_status_change`
  `BEFORE UPDATE` trigger, not by column grants (see `rls-policies.md` for
  why).
- **`admin_profiles`** — `user_id` (PK, FK to `auth.users`), `role`
  (`admin` | `super_admin`), `status`, `require_password_change`,
  `created_by`, `last_login_at`, timestamps.
- **`admin_permissions`** — `admin_user_id` FK, `permission` text (e.g.
  `"users.manage"`), unique `(admin_user_id, permission)`. Not consulted
  for `super_admin` rows — `has_permission()` short-circuits true for them.

## Billing

- **`subscription_plans`** — `slug`, `name_ar`/`name_en`, `price_iqd`,
  `duration_days`, `limits` (jsonb), `features` (jsonb). Seeded: Monthly
  (25,000 IQD) and Annual (250,000 IQD, marked as the 50,000 IQD savings
  plan vs. 12× monthly).
- **`activation_codes`** — `code` (unique), `status`
  (`available`/`used`/`expired`/`disabled`), `plan_id` FK, `used_by` FK,
  `used_at`. Deliberately **not** publicly readable — see
  `rls-policies.md`.
- **`subscriptions`** — `user_id`, `plan_id`, `status`
  (`pending`/`active`/`expired`/`cancelled`/`suspended`), `start_date`,
  `expiry_date`, `payment_id` FK (added by `ALTER TABLE` after `payments`
  exists in the same migration, since `payments` doesn't exist yet at the
  point `subscriptions` is first created).
- **`trial_usage`** — `user_id` (PK), `used`, `used_at`, `project_id` FK,
  `video_id` FK, `reset_count`, `last_reset_by`, `last_reset_reason`.
- **`payments`** — `user_id`, `subscription_id`, `amount_iqd`, `status`
  (`pending`/`verified`/`rejected`/`refunded`), `receipt_url` (points into
  the `payment-receipts` storage bucket), `verified_by`, `verified_at`.

## Production (video generation)

- **`projects`**, **`project_assets`**, **`project_revisions`**,
  **`videos`**, **`ai_jobs`**, **`render_jobs`** — owner-based (`owner_id`
  / via project FK), mirror the app's existing TypeScript domain types
  exactly.
- **`usage_events`** — append-only ledger, one row per billable action.
  Nothing currently aggregates from it (see "Known gaps" below).

## Support, CMS & settings (`005`)

`support_tickets` / `support_messages`, `admin_notes` (admin-only, never
visible to the entity owner via RLS), `notifications`, `announcements`,
`homepage_settings` / `homepage_sections`, `examples`, `faq_items`,
`developers` / `developer_links` / `developer_page_settings`,
`content_pages`, `legal_documents`, `navigation_items` (has a `CHECK`
constraint restricting `href` to `/`, `#`, or `https://` prefixes — blocks
`javascript:` and other unsafe schemes at the database level),
`footer_settings`, `social_links`, `seo_settings`, `system_settings`
(jsonb sub-blocks per domain), `feature_flags` (publicly readable by
design — the frontend needs to read these to gate behavior, they are not
secret), `email_templates` / `email_settings`, `assets`, `audit_logs` (no
`INSERT` policy for any role at all — only `SECURITY DEFINER` functions
write to it, so even an admin's own client can't forge an audit entry).

## Storage buckets (`006`)

`avatars`, `project-assets`, `videos`, `developer-images`, `site-assets`,
`payment-receipts`. Policies use `storage.foldername(name)` path-ownership
(`<user_id>/filename`) for user-owned buckets, admin-permission checks for
admin-managed ones (`developer-images`, `site-assets`), and a stricter
read-your-own-or-admin policy for `payment-receipts`.

## Functions & RPCs (`007`)

- **`redeem_activation_code(p_code)`** — `SELECT ... FOR UPDATE` row-locks
  the code row before checking status, so two concurrent redemptions of
  the same code can't both succeed. Returns jsonb
  `{status, plan_id?, expiry_date?}`. Writes an `audit_logs` row on
  success.
- **`verify_payment_and_activate_subscription(p_payment_id)`** —
  permission-checked (`payments.manage`), atomically marks a payment
  verified and activates the linked subscription.
- **`consume_trial`, `grant_trial`, `reset_trial`, `can_generate()`** —
  trial-lifecycle helpers used by the user-facing generation flow and the
  admin trials page.

## A TypeScript typing detail worth knowing

`lib/supabase/database.types.ts` is hand-written (not yet
`supabase gen types`-generated — no live project to generate from). Its
`Table<Row, Insert, Update>` helper **must** include a literal
`Relationships: [];` field. Without it, `@supabase/postgrest-js`'s
`GenericTable` constraint isn't satisfied and every query/RPC call across
the whole app silently infers as `never`, hiding real type errors instead
of surfacing them. The tradeoff: with `Relationships: []`, Supabase's
embedded-relationship select syntax (`.select("a, b(c)")`) doesn't resolve
FK joins at the type level. Rather than hand-declare FK relationship
metadata (real but easy to get subtly wrong across ~20 tables), every
service that needs data from two tables runs two separate queries and
merges in JS — see the pattern in `lib/admin/services/customers.ts`. This
is intentional, documented there, and should be followed by any further
service conversion rather than reintroduced as embedded selects.

## Known gaps / not yet built

- **`010_grants.sql` must be applied** — without it every direct table
  query returns Postgres error 42501 regardless of RLS. See
  `docs/rls-policies.md`.
- Every `lib/admin/services/*.ts` file is now Supabase-backed (no mock
  data remains in the admin panel). `usage_events`, `ai_jobs`,
  `render_jobs` and anything aggregated from them (usage page, finance
  revenue/cost, dashboard AI/render KPIs) legitimately reads as zero on a
  fresh project — those tables stay empty until AI generation is wired in
  the next phase, which is correct behavior, not a mock placeholder.
- No storage upload code exists yet in the app (buckets + RLS only).
