# Admin Routes

All routes live under `/admin` and render inside `app/admin/layout.tsx`
(`AdminShell`: sidebar + header). Every page currently reads from
`lib/admin/mock/*` via `lib/admin/services/*` — nothing persists across a
server restart. `[id]` routes call `notFound()` when the mock id doesn't
exist, matching how they'll behave once ids come from a real database.

| Route | Purpose | Guarded by permission |
|---|---|---|
| `/admin` | Dashboard — every KPI group, quick actions | `dashboard.read` |
| `/admin/users`, `/admin/users/[id]` | Customer accounts, 11-tab detail view | `users.read` / `users.manage` |
| `/admin/admins`, `/admin/admins/[id]` | Admin panel accounts, permission matrix | `admins.read` / `admins.manage` |
| `/admin/subscribers` | Read-focused subscriber list with expiry filters | `subscriptions.read` |
| `/admin/plans`, `/admin/plans/[id]` | Plan editor incl. limits, features, **profit simulator** | `plans.read` / `plans.manage` |
| `/admin/subscriptions`, `/admin/subscriptions/[id]` | Subscription records + activate/extend/cancel | `subscriptions.read` / `.manage` |
| `/admin/activation-codes` | Bulk code generator, disable/enable | `codes.read` / `codes.manage` |
| `/admin/trials` | Grant / reset trial videos | `trials.read` / `trials.manage` |
| `/admin/payments`, `/admin/payments/[id]` | Manual payment verification queue | `payments.read` / `.manage` |
| `/admin/projects`, `/admin/projects/[id]` | Video projects incl. brief/scenes/cost tabs | `projects.read` / `.manage` |
| `/admin/videos`, `/admin/videos/[id]` | Rendered video registry | `videos.read` / `.manage` |
| `/admin/ai-jobs`, `/admin/ai-jobs/[id]` | AI job log with cost/token detail | `ai_jobs.read` / `.manage` |
| `/admin/render-jobs`, `/admin/render-jobs/[id]` | Render job log | `render_jobs.read` / `.manage` |
| `/admin/usage` | Platform usage breakdown + top consumers | `usage.read` |
| `/admin/finance` | Revenue/cost/profit + editable cost config | `finance.read` / `.manage` |
| `/admin/support`, `/admin/support/[id]` | Ticket queue + threaded reply | `support.read` / `.manage` |
| `/admin/notifications` | Internal admin notification feed | `notifications.read` |
| `/admin/announcements` | User-facing banner composer | `announcements.read` / `.manage` |
| `/admin/homepage` | Hero copy + section visibility/order | `homepage.read` / `.manage` |
| `/admin/content` | About MOVO page content | `content.read` / `.manage` |
| `/admin/examples` | Public "Examples" gallery management | `examples.read` / `.manage` |
| `/admin/faq` | FAQ CRUD | `faq.read` / `.manage` |
| `/admin/developers`, `/admin/developers/[id]` | Team/developers page | `developers.read` / `.manage` |
| `/admin/pages` | Generic informational pages (content only, no code) | `pages.read` / `.manage` |
| `/admin/legal` | Privacy/Terms/Subscription/Refund documents | `legal.read` / `.manage` |
| `/admin/navigation` | Public nav + footer nav links | `navigation.read` / `.manage` |
| `/admin/footer` | Footer copy, support contact, credit line | `footer.read` / `.manage` |
| `/admin/social` | Social channel URLs + enabled toggle | `social.read` / `.manage` |
| `/admin/seo` | Default site SEO metadata | `seo.read` / `.manage` |
| `/admin/assets` | Media library (mock architecture, no real storage) | `assets.read` / `.manage` |
| `/admin/localization` | Enabled languages, default locale, currency | `localization.read` / `.manage` |
| `/admin/email` | Sender info + the 6 transactional templates | `settings.read` / `.manage` |
| `/admin/feature-flags` | 16 feature flags + emergency kill switches | `feature_flags.read` / `.manage` |
| `/admin/activity` | Audit log timeline | `audit.read` |
| `/admin/system-health` | Per-service status (all `not_configured` until wired) | `system_health.read` / `.manage` |
| `/admin/settings` | Business/Brand/Contact/Limits/AI/Rendering/Storage/Security/Maintenance tabs + settings search | `settings.read` / `.manage` |

Global search (⌘K / Ctrl+K, `components/admin/layout/GlobalSearch.tsx`) indexes
users, admins, subscriptions, codes, payments, projects, videos and support
tickets client-side from the same mock arrays.
