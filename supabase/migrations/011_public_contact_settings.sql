-- 011_public_contact_settings.sql
-- The /subscription page needs to show real phone/WhatsApp/email contact
-- info from system_settings.subscription_contact (and payment_contact),
-- but system_settings as a whole is admin-only ("settings.read" — see
-- 005_support_content_settings.sql) and stays that way: it also holds
-- security/kill-switch/AI-provider config that must never be public.
--
-- RLS can't expose only some jsonb columns of a row while hiding others on
-- the same row, so instead of loosening the table's RLS (which would leak
-- everything), this adds one narrow SECURITY DEFINER function that returns
-- only the three contact blobs — the same pattern already used by
-- is_admin()/has_permission()/can_generate() (002/007). Additive only;
-- 001-010 are untouched.

create or replace function public.get_contact_settings()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'supportContact', support_contact,
    'subscriptionContact', subscription_contact,
    'paymentContact', payment_contact
  )
  from public.system_settings
  where id = 1;
$$;

grant execute on function public.get_contact_settings() to anon, authenticated;
