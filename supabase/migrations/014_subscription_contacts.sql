-- 014_subscription_contacts.sql
-- Lets the admin configure more than one WhatsApp contact for subscription
-- activation (e.g. several activation staff), instead of the single
-- system_settings.subscription_contact.whatsapp field. A proper table, not
-- multiple numbers crammed into one text field — public.system_settings and
-- its subscription_contact/support_contact/payment_contact jsonb are left
-- completely untouched (phone/email for subscriptions stay single fields
-- there, as designed). Additive only; 001-013 are untouched.

create table public.subscription_contacts (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  whatsapp text not null,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscription_contacts_set_updated_at
  before update on public.subscription_contacts
  for each row execute function public.set_updated_at();

create index subscription_contacts_active_idx on public.subscription_contacts (active);

alter table public.subscription_contacts enable row level security;

-- Same tier as subscription_contact itself: public can read the active
-- list (it's shown on /subscription to anyone deciding how to activate),
-- admin write gated by the existing settings.* permission (same resource
-- that already governs system_settings.subscription_contact).
create policy "subscription_contacts: public can read active"
  on public.subscription_contacts for select to anon, authenticated using (active = true);
create policy "subscription_contacts: settings.read can read all"
  on public.subscription_contacts for select using (public.has_permission('settings.read'));
create policy "subscription_contacts: settings.manage can write"
  on public.subscription_contacts for all
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

-- One-time, idempotent migration of whatever WhatsApp number is already
-- configured in system_settings.subscription_contact.whatsapp, so nothing
-- already set up is lost. Guarded by "table is still empty" rather than
-- ON CONFLICT (no natural unique key to conflict on) — safe to re-run.
insert into public.subscription_contacts (name_ar, name_en, whatsapp, active, display_order)
select
  'فريق الاشتراكات',
  'Subscriptions team',
  ss.subscription_contact -> 'whatsapp' ->> 'value',
  true,
  1
from public.system_settings ss
where ss.id = 1
  and coalesce(ss.subscription_contact -> 'whatsapp' ->> 'value', '') <> ''
  and coalesce((ss.subscription_contact -> 'whatsapp' ->> 'enabled')::boolean, false)
  and not exists (select 1 from public.subscription_contacts);
