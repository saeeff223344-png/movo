-- 008_settings_gaps.sql
-- Fills four gaps discovered while converting the admin panel from Mock to
-- Supabase: four admin-manageable settings screens (branding, the About
-- page, localization, and finance cost assumptions) had no table in
-- 001-007. Each follows the exact singleton-row pattern already established
-- by homepage_settings/seo_settings/footer_settings/email_settings/
-- developer_page_settings (001-007 are never modified — this only adds).

create table public.branding_settings (
  id integer primary key default 1 check (id = 1),
  brand_name_ar text not null default 'موفو',
  brand_name_en text not null default 'MOVO',
  tagline_ar text not null default '',
  tagline_en text not null default '',
  logo_url text,
  logo_dark_url text,
  logo_light_url text,
  favicon_url text,
  og_image_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create trigger branding_settings_set_updated_at
  before update on public.branding_settings
  for each row execute function public.set_updated_at();

insert into public.branding_settings (id, brand_name_ar, brand_name_en, tagline_ar, tagline_en)
values (1, 'موفو', 'MOVO', 'حوّل فكرتك إلى فيديو', 'Turn your idea into video')
on conflict (id) do nothing;

create table public.about_page_settings (
  id integer primary key default 1 check (id = 1),
  page_title_ar text not null default '',
  page_title_en text not null default '',
  intro_ar text not null default '',
  intro_en text not null default '',
  story_ar text not null default '',
  story_en text not null default '',
  mission_ar text not null default '',
  mission_en text not null default '',
  vision_ar text not null default '',
  vision_en text not null default '',
  values_ar text not null default '',
  values_en text not null default '',
  cta_text_ar text not null default '',
  cta_text_en text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create trigger about_page_settings_set_updated_at
  before update on public.about_page_settings
  for each row execute function public.set_updated_at();

insert into public.about_page_settings (
  id, page_title_ar, page_title_en, intro_ar, intro_en, cta_text_ar, cta_text_en
) values (
  1, 'عن MOVO', 'About MOVO',
  'منصة عربية وعالمية لتحويل الأفكار إلى فيديوهات إعلانية جاهزة للنشر.',
  'An Arabic-first, global platform turning ideas into publish-ready ad videos.',
  'ابدأ الآن', 'Get started'
)
on conflict (id) do nothing;

create table public.localization_settings (
  id integer primary key default 1 check (id = 1),
  arabic_enabled boolean not null default true,
  english_enabled boolean not null default true,
  default_locale text not null default 'ar' check (default_locale in ('ar', 'en')),
  currency_display text not null default 'IQD' check (currency_display in ('IQD', 'USD', 'both')),
  date_format text not null default 'gregorian' check (date_format in ('gregorian', 'hijri_gregorian')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create trigger localization_settings_set_updated_at
  before update on public.localization_settings
  for each row execute function public.set_updated_at();

insert into public.localization_settings (id) values (1) on conflict (id) do nothing;

-- Internal cost-per-unit assumptions used to estimate ai_jobs/render_jobs
-- cost_usd/cost_iqd once AI is wired — never public, mirrors
-- system_settings' sensitivity level exactly.
create table public.finance_cost_config (
  id integer primary key default 1 check (id = 1),
  exchange_rate_usd_to_iqd numeric(10, 2) not null default 1310,
  text_ai_cost_per_request_usd numeric(10, 4) not null default 0,
  image_ai_cost_per_image_usd numeric(10, 4) not null default 0,
  video_ai_cost_per_second_usd numeric(10, 4) not null default 0,
  voice_cost_per_second_usd numeric(10, 4) not null default 0,
  render_cost_per_minute_usd numeric(10, 4) not null default 0,
  storage_cost_per_gb_usd numeric(10, 4) not null default 0,
  bandwidth_cost_per_gb_usd numeric(10, 4) not null default 0,
  other_cost_per_video_usd numeric(10, 4) not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create trigger finance_cost_config_set_updated_at
  before update on public.finance_cost_config
  for each row execute function public.set_updated_at();

insert into public.finance_cost_config (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- RLS — branding/about/localization are public marketing-adjacent config
-- (same tier as homepage_settings/seo_settings/developer_page_settings);
-- finance_cost_config is internal, same tier as system_settings.
-- ---------------------------------------------------------------------

alter table public.branding_settings enable row level security;
alter table public.about_page_settings enable row level security;
alter table public.localization_settings enable row level security;
alter table public.finance_cost_config enable row level security;

create policy "branding_settings: public can read"
  on public.branding_settings for select to anon, authenticated using (true);
create policy "branding_settings: settings.manage can write"
  on public.branding_settings for all
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

create policy "about_page_settings: public can read"
  on public.about_page_settings for select to anon, authenticated using (true);
create policy "about_page_settings: content.manage can write"
  on public.about_page_settings for all
  using (public.has_permission('content.manage'))
  with check (public.has_permission('content.manage'));

create policy "localization_settings: public can read"
  on public.localization_settings for select to anon, authenticated using (true);
create policy "localization_settings: localization.manage can write"
  on public.localization_settings for all
  using (public.has_permission('localization.manage'))
  with check (public.has_permission('localization.manage'));

create policy "finance_cost_config: finance.read can read"
  on public.finance_cost_config for select using (public.has_permission('finance.read'));
create policy "finance_cost_config: finance.manage can write"
  on public.finance_cost_config for all
  using (public.has_permission('finance.manage'))
  with check (public.has_permission('finance.manage'));
