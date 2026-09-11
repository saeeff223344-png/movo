# Dynamic Content vs. System Code

The rule behind every `/admin/*` screen: **anything that can reasonably
change after launch — a price, a limit, a contact number, a piece of
marketing copy, a feature toggle — should be admin-manageable, not
hardcoded.** But not everything belongs in a CMS. This document draws that
line explicitly.

## The five categories (from the original brief)

1. **System Code** — stays in the repository, reviewed via git, deployed
   like any other code change.
2. **Business Configuration** — pricing, limits, subscription rules,
   feature flags. Admin-managed.
3. **Dynamic Content** — marketing copy, images, links, FAQ, legal text.
   Admin-managed.
4. **User Data** — accounts, projects, videos, usage. Owned by the app,
   viewed/moderated via admin.
5. **Operational Data** — subscriptions, payments, support tickets, audit
   logs. Owned by the app, managed via admin.

## What the admin panel controls (categories 2–5)

Everything under `lib/admin/types/*` — see `docs/admin-data-model.md` for
the exhaustive table-by-table breakdown. In short: pricing and plan limits,
trial rules, activation codes, contact numbers (support/subscription/
payment, each per-channel enabled/disabled), homepage copy and section
visibility, examples/FAQ/legal/developers/pages content, navigation and
footer links, social links, SEO defaults, feature flags and kill switches,
maintenance mode, rate/usage limits, AI provider routing (not keys),
rendering/storage defaults, and the full audit trail of who changed what.

## What stays in code (category 1) — never becomes a database row

- React component implementation and layout logic.
- Security/authorization *enforcement* logic (`hasPermission()` itself,
  middleware, RLS policies) — the admin panel can grant/revoke permissions,
  but the code that checks them is not editable from the UI.
- Business-critical validation logic (e.g. how a plan's price is applied at
  checkout) — the *values* are configurable, the *logic* is not.
- The Remotion composition source and its animation code
  (`remotion/compositions/*`). The admin panel can eventually feed a
  composition *props* (title, price, style, assets) once a real generation
  pipeline exists, but nobody edits scene JSX from `/admin`.
- API/service secrets (AI provider keys, SMTP credentials, payment gateway
  keys). These are server-only environment variables. The admin UI shows
  *which* provider/template is active, never a secret value — see the
  "secrets hint" text on `/admin/email` and the AI tab of `/admin/settings`.
- Routing, permission schema, and database schema/migrations.
- Any "raw code" editor — deliberately not built. `/admin/pages` and
  `/admin/content` edit structured text fields (title/body/SEO), not
  arbitrary HTML or scripts.

## How the public frontend will consume this later (without a rewrite)

Today the public site (`app/(marketing)/*`) reads static copy from
`lib/i18n/dictionaries/*` and `lib/data/*`. The admin mock services in
`lib/admin/services/*` already model the *exact* shape that content will
have once it's admin-managed (`HomepageConfiguration`, `ExampleVideo`,
`FaqItem`, `DeveloperProfile`, `NavigationConfiguration`,
`FooterSettings`, `SocialLink`, `SeoSettings`, `FeatureFlag`...). The
migration path is:

1. Replace the body of each `getX()` in `lib/admin/services/*` with a
   Supabase query returning the same TypeScript type.
2. Add a thin public-facing read (e.g. `getPublicHomepageConfig()`) that
   calls the same table, filtered to `enabled`/`published` rows.
3. Swap the hardcoded values in the marketing components for that data.

No public page needs to be restructured to do this — the types were
designed against the current pages' actual props from the start.

## Mock-data honesty rule

Every mock file under `lib/admin/mock/*` and service under
`lib/admin/services/*` is a plain in-memory array/function — nothing
persists across a server restart, and "manage" actions in the UI (toggles,
edits, confirmations) mutate local React state, not the underlying mock
module. This is intentional: the UI must never *imply* a save is durable
when it isn't. See the file-level comments in `lib/admin/services/*` for
the exact phrasing used to mark this.
