# Future Database Model (Supabase)

> **Superseded.** The SQL schema described conceptually below now actually
> exists — see `docs/database-schema.md` for the real, applied migration
> files (`supabase/migrations/001`–`007`). This file is kept for history;
> the tables it sketches match what was actually built. No live Supabase
> *project* is connected yet (see `docs/supabase-setup.md`), but the SQL
> itself is no longer conceptual.

Conceptual only — **no SQL has been run, no Supabase project is connected.**
This documents the shape the current `lib/admin/types/*` and
`lib/types/*` TypeScript models are already written to match, so that
connecting Supabase later is a matter of writing queries against these
tables, not redesigning the frontend.

Every table implicitly needs `created_at`/`updated_at`, and every table
below that holds user-supplied or admin-supplied content needs Row Level
Security — see the "never trust the frontend" note in
`admin-permissions.md`.

## Identity & accounts

- **`profiles`** — one row per app user (extends `auth.users`). Mirrors
  `UserAccount`: language, trial_used, subscription fields are *derived*
  from the tables below, not stored redundantly, once real.
- **`admin_profiles`** — one row per admin panel account. Mirrors
  `AdminAccount` minus any credential — Supabase Auth owns the password.
- **`admin_permissions`** (or a `roles` + join table) — the granted
  `AdminPermission[]` for non-super-admins.

## Billing

- **`subscription_plans`** — mirrors `SubscriptionPlan` (pricing, limits,
  features as jsonb or normalized columns).
- **`subscriptions`** — mirrors `AdminSubscription`, FK to `profiles` and
  `subscription_plans`.
- **`activation_codes`** — mirrors `ActivationCode`; `used_by` FK to
  `profiles`, unique constraint on `code`.
- **`trial_usage`** — mirrors `TrialRecord`, one row per user.
- **`payments`** — mirrors `PaymentRecord`, FK to `profiles` and
  `subscriptions`.

## Production (video generation)

- **`projects`** — mirrors `AdminProject` / the user-facing `VideoProject`.
- **`project_assets`** — uploaded product/logo/reference/video assets per
  project (mirrors `Asset` from `lib/types/video.ts`).
- **`project_revisions`** — mirrors `Revision`; the natural-language edit
  history per project.
- **`videos`** — mirrors `AdminVideo`, FK to `projects`.
- **`ai_jobs`** — mirrors `AIJob`, FK to `projects` + `profiles`.
- **`render_jobs`** — mirrors `RenderJob`, FK to `projects` + `videos`.
- **`usage_events`** — append-only log the `usage` and `finance` pages
  aggregate from (one row per billable action: a generation, a render
  minute, a storage delta...).

## Support & comms

- **`support_tickets`** / **`support_messages`** — mirrors
  `AdminSupportTicket` + its `messages[]`, normalized into two tables.
- **`admin_notes`** — internal notes on a user/subscription/payment/ticket;
  never exposed to the `profiles` owner via RLS.
- **`notifications`** — internal admin feed (mirrors `AdminNotification`).
- **`announcements`** — mirrors `Announcement`, including `audience` for
  future targeted broadcast.

## Site content (what the public frontend will read once wired)

- **`homepage_settings`** — the hero fields (singleton row).
- **`homepage_sections`** — mirrors `HomepageSection[]`, ordered.
- **`examples`** — mirrors `ExampleVideo`, backs both `/admin/examples` and
  the public `/templates` page.
- **`faq_items`** — mirrors `FaqItem`.
- **`developers`** — mirrors `DeveloperProfile`.
- **`developer_page_settings`** — singleton, mirrors `DeveloperPageSettings`.
- **`content_pages`** — mirrors `ContentPage` (generic informational pages;
  the About page can live here as a fixed slug, or in its own
  `about_content` singleton — either maps cleanly onto `AboutPageContent`).
- **`legal_documents`** — mirrors `LegalDocument`, one row per
  `LegalDocumentType`.

## Appearance & site config

- **`navigation_items`** — mirrors `NavigationItem` (+ a `group` column for
  desktop vs. footer).
- **`footer_settings`** — singleton, mirrors `FooterSettings`.
- **`social_links`** — mirrors `SocialLink`.
- **`seo_settings`** — singleton, mirrors `SeoSettings`.
- **`branding_settings`** — singleton, mirrors `BrandingSettings`.
- **`assets`** — mirrors `AdminAsset`, FK to actual Supabase Storage
  objects once uploads are real.

## System

- **`system_settings`** — singleton (or split per sub-domain: business,
  limits, ai_providers, rendering, storage, security, maintenance,
  kill_switches, support/subscription/payment contact) — mirrors
  `SystemSettings`.
- **`feature_flags`** — mirrors `FeatureFlag`, keyed by `FeatureFlagId`.
- **`email_settings`** / **`email_templates`** — mirrors `EmailSettings`;
  SMTP/API keys live in server-only env vars, never in this table.
- **`localization_settings`** — singleton, mirrors `LocalizationSettings`.
- **`audit_logs`** — append-only, mirrors `AuditLogEntry`. Every mutating
  admin action in `admin-permissions.md`'s enforcement layer should insert
  one row here server-side (not from the client).

## What is deliberately *not* a table

`docs/dynamic-content.md` lists what stays hardcoded in the codebase
(component logic, validation, routing, secrets) — none of that becomes a
database row just because an admin panel exists.
