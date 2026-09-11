-- 012_profile_email_sync.sql
-- profiles.email is a snapshot (see 001_core_auth_profiles.sql), kept in
-- sync on signup by handle_new_user() — but that trigger only fires on
-- INSERT. A user changing their email goes through Supabase Auth's normal
-- double opt-in flow (auth.updateUser({ email })), which only updates
-- auth.users.email once the confirmation link is clicked; there was no
-- trigger to carry that change into profiles.email afterward. This adds
-- one, so the settings page (and everywhere else that reads profiles.email)
-- picks up the new address automatically once — and only once — Supabase
-- itself has confirmed it. Additive only; 001-011 are untouched.

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();
