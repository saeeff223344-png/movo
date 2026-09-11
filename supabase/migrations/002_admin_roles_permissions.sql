-- 002_admin_roles_permissions.sql
-- Admin panel accounts and their permissions, plus the SECURITY DEFINER
-- helper functions every later RLS policy in this project calls. These
-- functions are the server-side source of truth for authorization — the
-- frontend never decides access on its own (see docs/admin-permissions.md).

create table public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'super_admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  require_password_change boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

comment on table public.admin_profiles is 'Grants admin-panel access. A user with no row here is a normal user.';

create trigger admin_profiles_set_updated_at
  before update on public.admin_profiles
  for each row execute function public.set_updated_at();

-- One row per (admin, permission) for `admin` role accounts. super_admin
-- rows never need entries here — is_super_admin() short-circuits every check.
create table public.admin_permissions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_profiles (user_id) on delete cascade,
  permission text not null,
  created_at timestamptz not null default now(),
  unique (admin_user_id, permission)
);

comment on column public.admin_permissions.permission is
  'e.g. "users.manage" — matches AdminPermission in lib/admin/config/permissions.ts';

-- ---------------------------------------------------------------------
-- Authorization helper functions (SECURITY DEFINER so they can read
-- admin_profiles/admin_permissions regardless of the calling role's own
-- RLS visibility into those tables).
-- ---------------------------------------------------------------------

create or replace function public.is_admin(check_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where user_id = check_uid and status = 'active'
  );
$$;

create or replace function public.is_super_admin(check_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where user_id = check_uid and status = 'active' and role = 'super_admin'
  );
$$;

create or replace function public.has_permission(perm text, check_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select
    public.is_super_admin(check_uid)
    or exists (
      select 1 from public.admin_permissions
      where admin_user_id = check_uid and permission = perm
    );
$$;

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.has_permission(text, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- admin_profiles / admin_permissions RLS
-- ---------------------------------------------------------------------

alter table public.admin_profiles enable row level security;
alter table public.admin_permissions enable row level security;

create policy "admin_profiles: self can read own row"
  on public.admin_profiles for select
  using (auth.uid() = user_id);

create policy "admin_profiles: admins.read can read all"
  on public.admin_profiles for select
  using (public.has_permission('admins.read'));

create policy "admin_profiles: admins.manage can write"
  on public.admin_profiles for all
  using (public.has_permission('admins.manage'))
  with check (public.has_permission('admins.manage'));

create policy "admin_permissions: self can read own"
  on public.admin_permissions for select
  using (auth.uid() = admin_user_id);

create policy "admin_permissions: admins.read can read all"
  on public.admin_permissions for select
  using (public.has_permission('admins.read'));

create policy "admin_permissions: admins.manage can write"
  on public.admin_permissions for all
  using (public.has_permission('admins.manage'))
  with check (public.has_permission('admins.manage'));

-- ---------------------------------------------------------------------
-- Now that is_admin()/has_permission() exist, extend profiles' RLS
-- (created in 001) with admin visibility and management.
-- ---------------------------------------------------------------------

create policy "profiles: users.read can read all"
  on public.profiles for select
  using (public.has_permission('users.read'));

create policy "profiles: users.manage can update all"
  on public.profiles for update
  using (public.has_permission('users.manage'))
  with check (public.has_permission('users.manage'));

-- account_status changes are additionally gated by the
-- profiles_guard_status_change trigger from 001 — an admin with
-- users.manage passes that check, everyone else is rejected regardless of
-- which row-level policy let the UPDATE through.

create index admin_profiles_role_idx on public.admin_profiles (role);
create index admin_permissions_admin_user_id_idx on public.admin_permissions (admin_user_id);
