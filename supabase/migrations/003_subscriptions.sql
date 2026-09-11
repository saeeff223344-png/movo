-- 003_subscriptions.sql
-- Plans, activation codes, subscriptions, trial usage, payments.
-- IQD amounts are stored as whole-dinar integers (no fractional fils in
-- practice) — see docs/database-schema.md. USD costs elsewhere use numeric.

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ar text not null,
  name_en text not null,
  description_ar text not null default '',
  description_en text not null default '',
  price_iqd integer not null check (price_iqd >= 0),
  billing_period text not null check (billing_period in ('monthly', 'yearly')),
  duration_days integer not null check (duration_days > 0),
  active boolean not null default true,
  featured boolean not null default false,
  display_order integer not null default 0,
  -- Kept as jsonb: video/asset/etc. allowances are explicitly TBD per the
  -- product brief and shouldn't require a migration every time they change.
  -- `limits.videos` may be null, meaning "not yet decided".
  limits jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscription_plans_set_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

create table public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plan_id uuid not null references public.subscription_plans (id),
  duration_days integer not null,
  status text not null default 'available' check (status in ('available', 'used', 'expired', 'disabled')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  used_by uuid references auth.users (id),
  used_at timestamptz,
  notes text
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id),
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'cancelled', 'suspended')),
  price_iqd integer not null,
  start_date timestamptz,
  expiry_date timestamptz,
  activation_source text check (activation_source in ('activation_code', 'manual', 'promotion')),
  activation_code_id uuid references public.activation_codes (id),
  activated_by uuid references auth.users (id),
  payment_id uuid, -- FK added below, after public.payments exists
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancel_reason text,
  notes text,
  check (expiry_date is null or start_date is null or expiry_date > start_date)
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.trial_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  used boolean not null default false,
  used_at timestamptz,
  project_id uuid, -- FK added in 004, once public.projects exists
  video_id uuid,   -- FK added in 004, once public.videos exists
  reset_count integer not null default 0,
  last_reset_by uuid references auth.users (id),
  last_reset_reason text
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id),
  amount_iqd integer not null check (amount_iqd >= 0),
  method text not null check (method in ('manual', 'bank_transfer', 'mastercard', 'zaincash', 'asiahawala', 'other')),
  reference text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'refunded')),
  paid_at timestamptz not null default now(),
  verified_by uuid references auth.users (id),
  verified_at timestamptz,
  notes text
);

alter table public.subscriptions
  add constraint subscriptions_payment_id_fkey
  foreign key (payment_id) references public.payments (id);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_expiry_date_idx on public.subscriptions (expiry_date);
create index activation_codes_status_idx on public.activation_codes (status);
create index payments_user_id_idx on public.payments (user_id);
create index payments_status_idx on public.payments (status);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.subscription_plans enable row level security;
alter table public.activation_codes enable row level security;
alter table public.subscriptions enable row level security;
alter table public.trial_usage enable row level security;
alter table public.payments enable row level security;

-- Plans are public marketing/pricing info — anyone (incl. anon) can read
-- active plans; only plans.manage can write.
create policy "subscription_plans: public can read active"
  on public.subscription_plans for select
  to anon, authenticated
  using (active = true);

create policy "subscription_plans: plans.read can read all"
  on public.subscription_plans for select
  using (public.has_permission('plans.read'));

create policy "subscription_plans: plans.manage can write"
  on public.subscription_plans for all
  using (public.has_permission('plans.manage'))
  with check (public.has_permission('plans.manage'));

-- Activation codes are never publicly listable (that would leak unused
-- codes). Redemption happens exclusively through the redeem_activation_code
-- RPC in 007, which runs as SECURITY DEFINER — a normal user never needs a
-- SELECT/UPDATE grant on this table at all.
create policy "activation_codes: codes.read can read"
  on public.activation_codes for select
  using (public.has_permission('codes.read'));

create policy "activation_codes: codes.manage can write"
  on public.activation_codes for all
  using (public.has_permission('codes.manage'))
  with check (public.has_permission('codes.manage'));

create policy "subscriptions: user can read own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "subscriptions: subscriptions.read can read all"
  on public.subscriptions for select
  using (public.has_permission('subscriptions.read'));

create policy "subscriptions: subscriptions.manage can write"
  on public.subscriptions for all
  using (public.has_permission('subscriptions.manage'))
  with check (public.has_permission('subscriptions.manage'));

create policy "trial_usage: user can read own"
  on public.trial_usage for select
  using (auth.uid() = user_id);

create policy "trial_usage: trials.read can read all"
  on public.trial_usage for select
  using (public.has_permission('trials.read'));

create policy "trial_usage: trials.manage can write"
  on public.trial_usage for all
  using (public.has_permission('trials.manage'))
  with check (public.has_permission('trials.manage'));

create policy "payments: user can read own"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "payments: user can insert own"
  on public.payments for insert
  with check (auth.uid() = user_id and status = 'pending');

create policy "payments: payments.read can read all"
  on public.payments for select
  using (public.has_permission('payments.read'));

create policy "payments: payments.manage can write"
  on public.payments for all
  using (public.has_permission('payments.manage'))
  with check (public.has_permission('payments.manage'));
