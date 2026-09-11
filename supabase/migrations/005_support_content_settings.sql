-- 005_support_content_settings.sql
-- Support desk, internal admin notes/notifications, and every
-- admin-manageable piece of public site content + system configuration.

-- ---------------------------------------------------------------------
-- Support
-- ---------------------------------------------------------------------

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  category text not null check (category in (
    'account', 'subscription', 'payment', 'generation', 'video', 'ai', 'render', 'technical', 'other'
  )),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  assigned_admin uuid references auth.users (id),
  created_at timestamptz not null default now(),
  last_reply_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid not null references auth.users (id),
  author_type text not null check (author_type in ('user', 'admin')),
  message text not null,
  created_at timestamptz not null default now()
);

-- Internal-only notes on a user/subscription/payment/ticket. RLS below
-- guarantees these never appear to the entity's owner.
create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('user', 'subscription', 'payment', 'support_ticket')),
  entity_id uuid not null,
  author_id uuid not null references auth.users (id),
  note text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('admin', 'user')),
  user_id uuid references auth.users (id) on delete cascade,
  type text not null,
  title_ar text not null,
  title_en text not null,
  message_ar text not null,
  message_en text not null,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  check (audience = 'user' or user_id is null)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  title_en text not null,
  message_ar text not null,
  message_en text not null,
  type text not null check (type in ('info', 'success', 'warning', 'promotion', 'maintenance')),
  location text not null check (location in ('homepage', 'dashboard', 'subscription', 'global')),
  start_at timestamptz,
  end_at timestamptz,
  dismissible boolean not null default true,
  enabled boolean not null default false,
  audience text not null default 'all' check (audience in ('all', 'trial', 'active_subscribers', 'monthly', 'yearly', 'specific')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Homepage
-- ---------------------------------------------------------------------

create table public.homepage_settings (
  id integer primary key default 1 check (id = 1),
  hero jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create trigger homepage_settings_set_updated_at
  before update on public.homepage_settings
  for each row execute function public.set_updated_at();

create table public.homepage_sections (
  id text primary key,
  enabled boolean not null default true,
  title_ar text not null default '',
  title_en text not null default '',
  description_ar text not null default '',
  description_en text not null default '',
  display_order integer not null default 0
);

-- ---------------------------------------------------------------------
-- Marketing content
-- ---------------------------------------------------------------------

create table public.examples (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  title_en text not null,
  description_ar text not null default '',
  description_en text not null default '',
  category text not null,
  thumbnail_gradient text,
  video_url text,
  style_hint text,
  prompt_example text,
  featured boolean not null default false,
  display_order integer not null default 0,
  active boolean not null default true
);

create table public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question_ar text not null,
  question_en text not null,
  answer_ar text not null,
  answer_en text not null,
  category text,
  display_order integer not null default 0,
  active boolean not null default true
);

create table public.developers (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  job_title_ar text not null default '',
  job_title_en text not null default '',
  bio_ar text not null default '',
  bio_en text not null default '',
  photo_url text,
  email text,
  phone text,
  whatsapp text,
  skills text[] not null default '{}',
  featured boolean not null default false,
  visible boolean not null default true,
  display_order integer not null default 0
);

create table public.developer_links (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references public.developers (id) on delete cascade,
  platform text not null check (platform in ('github', 'linkedin', 'website', 'instagram', 'x')),
  url text not null
);

create table public.developer_page_settings (
  id integer primary key default 1 check (id = 1),
  page_title_ar text not null default '',
  page_title_en text not null default '',
  intro_ar text not null default '',
  intro_en text not null default '',
  description_ar text not null default '',
  description_en text not null default '',
  cta_text_ar text not null default '',
  cta_text_en text not null default '',
  section_visible boolean not null default true
);

create table public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_ar text not null,
  title_en text not null,
  content_ar text not null default '',
  content_en text not null default '',
  published boolean not null default false,
  seo_title text,
  seo_description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create trigger content_pages_set_updated_at
  before update on public.content_pages
  for each row execute function public.set_updated_at();

create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  type text not null unique check (type in (
    'privacy_policy', 'terms_of_use', 'subscription_terms', 'refund_policy', 'cookie_policy'
  )),
  title_ar text not null,
  title_en text not null,
  content_ar text not null default '',
  content_en text not null default '',
  published boolean not null default false,
  last_updated timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Appearance / site-wide config
-- ---------------------------------------------------------------------

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  group_key text not null check (group_key in ('desktop', 'footer')),
  label_ar text not null,
  label_en text not null,
  href text not null,
  enabled boolean not null default true,
  display_order integer not null default 0,
  open_new_tab boolean not null default false,
  -- No raw HTML/script hrefs — only relative paths, #-anchors or https URLs.
  visibility text not null default 'public' check (visibility in ('public', 'authenticated', 'both')),
  check (href ~ '^(/|#|https://)')
);

create table public.footer_settings (
  id integer primary key default 1 check (id = 1),
  short_description_ar text not null default '',
  short_description_en text not null default '',
  copyright_ar text not null default '',
  copyright_en text not null default '',
  support_phone text,
  support_email text,
  developer_credit_ar text not null default '',
  developer_credit_en text not null default '',
  visible boolean not null default true
);

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in (
    'instagram', 'tiktok', 'facebook', 'youtube', 'x', 'linkedin', 'telegram', 'whatsapp'
  )),
  url text not null default '',
  enabled boolean not null default false,
  label text
);

create table public.seo_settings (
  id integer primary key default 1 check (id = 1),
  site_title text not null default 'MOVO',
  title_template text not null default '%s — MOVO',
  description_ar text not null default '',
  description_en text not null default '',
  keywords text[] not null default '{}',
  og_title text,
  og_description text,
  og_image_url text,
  robots_index boolean not null default true,
  robots_follow boolean not null default true
);

-- ---------------------------------------------------------------------
-- System configuration
-- ---------------------------------------------------------------------

create table public.system_settings (
  id integer primary key default 1 check (id = 1),
  business jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  ai_providers jsonb not null default '[]'::jsonb,
  rendering jsonb not null default '{}'::jsonb,
  storage jsonb not null default '{}'::jsonb,
  security jsonb not null default '{}'::jsonb,
  maintenance jsonb not null default '{}'::jsonb,
  kill_switches jsonb not null default '{}'::jsonb,
  support_contact jsonb not null default '{}'::jsonb,
  subscription_contact jsonb not null default '{}'::jsonb,
  payment_contact jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger system_settings_set_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();

create table public.feature_flags (
  id text primary key,
  label_ar text not null,
  label_en text not null,
  description text not null default '',
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

create table public.email_templates (
  id text primary key,
  subject_ar text not null,
  subject_en text not null,
  body_ar text not null,
  body_en text not null
);

create table public.email_settings (
  id integer primary key default 1 check (id = 1),
  sender_name text not null default 'MOVO',
  reply_to text,
  support_email text
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  category text not null check (category in (
    'logo', 'brand', 'homepage', 'examples', 'developers', 'support', 'content', 'uploads'
  )),
  type text not null check (type in ('image', 'video', 'document')),
  storage_path text not null,
  size_kb integer,
  width integer,
  height integer,
  usage_ref text,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- Append-only. Every sensitive admin mutation should insert exactly one row
-- here from server-side code — never trust a client-supplied actor id, the
-- inserting function always uses auth.uid().
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id),
  action text not null,
  entity text not null,
  entity_id text,
  target_user uuid references auth.users (id),
  old_value text,
  new_value text,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

create index support_tickets_user_id_idx on public.support_tickets (user_id);
create index support_tickets_status_idx on public.support_tickets (status);
create index support_messages_ticket_id_idx on public.support_messages (ticket_id);
create index admin_notes_entity_idx on public.admin_notes (entity_type, entity_id);
create index notifications_user_id_idx on public.notifications (user_id);
create index examples_active_idx on public.examples (active);
create index faq_items_active_idx on public.faq_items (active);
create index developers_visible_idx on public.developers (visible);
create index content_pages_slug_idx on public.content_pages (slug);
create index navigation_items_group_key_idx on public.navigation_items (group_key);
create index audit_logs_admin_id_idx on public.audit_logs (admin_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.admin_notes enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;
alter table public.homepage_settings enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.examples enable row level security;
alter table public.faq_items enable row level security;
alter table public.developers enable row level security;
alter table public.developer_links enable row level security;
alter table public.developer_page_settings enable row level security;
alter table public.content_pages enable row level security;
alter table public.legal_documents enable row level security;
alter table public.navigation_items enable row level security;
alter table public.footer_settings enable row level security;
alter table public.social_links enable row level security;
alter table public.seo_settings enable row level security;
alter table public.system_settings enable row level security;
alter table public.feature_flags enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_settings enable row level security;
alter table public.assets enable row level security;
alter table public.audit_logs enable row level security;

-- Support: user owns their tickets/messages; support.read/manage for admins.
create policy "support_tickets: user can manage own"
  on public.support_tickets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "support_tickets: support.read can read all"
  on public.support_tickets for select
  using (public.has_permission('support.read'));

create policy "support_tickets: support.manage can write all"
  on public.support_tickets for all
  using (public.has_permission('support.manage'))
  with check (public.has_permission('support.manage'));

create policy "support_messages: participant can read"
  on public.support_messages for select
  using (exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and t.user_id = auth.uid()
  ));

create policy "support_messages: user can reply on own ticket"
  on public.support_messages for insert
  with check (
    author_type = 'user' and author_id = auth.uid()
    and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

create policy "support_messages: support.read can read all"
  on public.support_messages for select
  using (public.has_permission('support.read'));

create policy "support_messages: support.manage can write all"
  on public.support_messages for all
  using (public.has_permission('support.manage'))
  with check (public.has_permission('support.manage'));

-- Admin notes: never visible to the entity's owner, ever.
create policy "admin_notes: admins can read"
  on public.admin_notes for select
  using (public.is_admin());

create policy "admin_notes: admins can write"
  on public.admin_notes for insert
  with check (public.is_admin() and author_id = auth.uid());

create policy "notifications: user can read own"
  on public.notifications for select
  using (audience = 'user' and auth.uid() = user_id);

create policy "notifications: admins can read admin feed"
  on public.notifications for select
  using (audience = 'admin' and public.is_admin());

create policy "notifications: notifications.manage can write"
  on public.notifications for all
  using (public.has_permission('notifications.manage'))
  with check (public.has_permission('notifications.manage'));

-- Public content: readable by everyone (incl. anon) when enabled/published;
-- admins with the matching .read permission can see drafts too; .manage
-- required to write.
create policy "announcements: public can read enabled"
  on public.announcements for select to anon, authenticated using (enabled = true);
create policy "announcements: announcements.read can read all"
  on public.announcements for select using (public.has_permission('announcements.read'));
create policy "announcements: announcements.manage can write"
  on public.announcements for all
  using (public.has_permission('announcements.manage'))
  with check (public.has_permission('announcements.manage'));

create policy "homepage_settings: public can read"
  on public.homepage_settings for select to anon, authenticated using (true);
create policy "homepage_settings: homepage.manage can write"
  on public.homepage_settings for all
  using (public.has_permission('homepage.manage'))
  with check (public.has_permission('homepage.manage'));

create policy "homepage_sections: public can read enabled"
  on public.homepage_sections for select to anon, authenticated using (enabled = true);
create policy "homepage_sections: homepage.read can read all"
  on public.homepage_sections for select using (public.has_permission('homepage.read'));
create policy "homepage_sections: homepage.manage can write"
  on public.homepage_sections for all
  using (public.has_permission('homepage.manage'))
  with check (public.has_permission('homepage.manage'));

create policy "examples: public can read active"
  on public.examples for select to anon, authenticated using (active = true);
create policy "examples: examples.read can read all"
  on public.examples for select using (public.has_permission('examples.read'));
create policy "examples: examples.manage can write"
  on public.examples for all
  using (public.has_permission('examples.manage'))
  with check (public.has_permission('examples.manage'));

create policy "faq_items: public can read active"
  on public.faq_items for select to anon, authenticated using (active = true);
create policy "faq_items: faq.read can read all"
  on public.faq_items for select using (public.has_permission('faq.read'));
create policy "faq_items: faq.manage can write"
  on public.faq_items for all
  using (public.has_permission('faq.manage'))
  with check (public.has_permission('faq.manage'));

create policy "developers: public can read visible"
  on public.developers for select to anon, authenticated using (visible = true);
create policy "developers: developers.read can read all"
  on public.developers for select using (public.has_permission('developers.read'));
create policy "developers: developers.manage can write"
  on public.developers for all
  using (public.has_permission('developers.manage'))
  with check (public.has_permission('developers.manage'));

create policy "developer_links: public can read"
  on public.developer_links for select to anon, authenticated using (true);
create policy "developer_links: developers.manage can write"
  on public.developer_links for all
  using (public.has_permission('developers.manage'))
  with check (public.has_permission('developers.manage'));

create policy "developer_page_settings: public can read"
  on public.developer_page_settings for select to anon, authenticated using (true);
create policy "developer_page_settings: developers.manage can write"
  on public.developer_page_settings for all
  using (public.has_permission('developers.manage'))
  with check (public.has_permission('developers.manage'));

create policy "content_pages: public can read published"
  on public.content_pages for select to anon, authenticated using (published = true);
create policy "content_pages: content.read can read all"
  on public.content_pages for select using (public.has_permission('content.read'));
create policy "content_pages: content.manage can write"
  on public.content_pages for all
  using (public.has_permission('content.manage'))
  with check (public.has_permission('content.manage'));

create policy "legal_documents: public can read published"
  on public.legal_documents for select to anon, authenticated using (published = true);
create policy "legal_documents: legal.read can read all"
  on public.legal_documents for select using (public.has_permission('legal.read'));
create policy "legal_documents: legal.manage can write"
  on public.legal_documents for all
  using (public.has_permission('legal.manage'))
  with check (public.has_permission('legal.manage'));

create policy "navigation_items: public can read enabled"
  on public.navigation_items for select to anon, authenticated using (enabled = true);
create policy "navigation_items: navigation.read can read all"
  on public.navigation_items for select using (public.has_permission('navigation.read'));
create policy "navigation_items: navigation.manage can write"
  on public.navigation_items for all
  using (public.has_permission('navigation.manage'))
  with check (public.has_permission('navigation.manage'));

create policy "footer_settings: public can read"
  on public.footer_settings for select to anon, authenticated using (true);
create policy "footer_settings: footer.manage can write"
  on public.footer_settings for all
  using (public.has_permission('footer.manage'))
  with check (public.has_permission('footer.manage'));

create policy "social_links: public can read enabled"
  on public.social_links for select to anon, authenticated using (enabled = true);
create policy "social_links: social.read can read all"
  on public.social_links for select using (public.has_permission('social.read'));
create policy "social_links: social.manage can write"
  on public.social_links for all
  using (public.has_permission('social.manage'))
  with check (public.has_permission('social.manage'));

create policy "seo_settings: public can read"
  on public.seo_settings for select to anon, authenticated using (true);
create policy "seo_settings: seo.manage can write"
  on public.seo_settings for all
  using (public.has_permission('seo.manage'))
  with check (public.has_permission('seo.manage'));

-- Feature flags are not secret — the frontend needs to read them (even
-- anonymously) to decide whether to show signup/generation UI at all.
create policy "feature_flags: public can read"
  on public.feature_flags for select to anon, authenticated using (true);
create policy "feature_flags: feature_flags.manage can write"
  on public.feature_flags for all
  using (public.has_permission('feature_flags.manage'))
  with check (public.has_permission('feature_flags.manage'));

-- system_settings, email_*, assets and audit_logs hold operationally
-- sensitive data (contact numbers are the exception surfaced publicly via a
-- dedicated read below) — admin-only, never public.
create policy "system_settings: settings.read can read"
  on public.system_settings for select using (public.has_permission('settings.read'));
create policy "system_settings: settings.manage can write"
  on public.system_settings for all
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

create policy "email_templates: settings.read can read"
  on public.email_templates for select using (public.has_permission('settings.read'));
create policy "email_templates: settings.manage can write"
  on public.email_templates for all
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

create policy "email_settings: settings.read can read"
  on public.email_settings for select using (public.has_permission('settings.read'));
create policy "email_settings: settings.manage can write"
  on public.email_settings for all
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

create policy "assets: assets.read can read"
  on public.assets for select using (public.has_permission('assets.read'));
create policy "assets: assets.manage can write"
  on public.assets for all
  using (public.has_permission('assets.manage'))
  with check (public.has_permission('assets.manage'));

create policy "audit_logs: audit.read can read"
  on public.audit_logs for select using (public.has_permission('audit.read'));
-- No insert policy for any role: audit rows are written exclusively by
-- SECURITY DEFINER functions (007), which bypass RLS by design.
