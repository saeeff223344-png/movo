-- 001_core_auth_profiles.sql
-- One row per authenticated user, 1:1 with auth.users. Never stores a
-- password — Supabase Auth owns credentials entirely.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  preferred_language text not null default 'ar' check (preferred_language in ('ar', 'en')),
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz
);

comment on table public.profiles is 'One row per auth.users row. Public-facing account data only — never a password.';

-- Generic updated_at trigger, reused by every table below that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row the moment a new auth.users row appears, so the
-- app never has to do it client-side (avoids race conditions / RLS gaps
-- during signup). Reads the display name from the signUp() call's
-- `options.data.full_name`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles: user can read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: user can update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- RLS only restricts which *rows* a policy applies to, not which columns —
-- without this trigger a user could UPDATE their own row and flip their own
-- account_status back to 'active'. The users.manage check inside is added
-- once has_permission() exists (002_admin_roles_permissions.sql); until then
-- this trigger simply blocks every status change, which is the safe default.
create or replace function public.guard_profile_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.account_status is distinct from old.account_status then
    if not coalesce((select public.has_permission('users.manage')), false) then
      raise exception 'account_status can only be changed by an admin with users.manage';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_status_change
  before update on public.profiles
  for each row execute function public.guard_profile_status_change();

-- Admin read/manage SELECT/UPDATE policies are added in
-- 002_admin_roles_permissions.sql, once the is_admin()/has_permission()
-- helpers exist (has_permission() itself is referenced above via a function
-- body, which Postgres allows to forward-reference — it's only resolved
-- when the trigger actually fires, by which point 002 has already run).
