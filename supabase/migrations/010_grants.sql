-- 010_grants.sql
-- Fixes a real bug found by testing directly against the live project: every
-- table created in 001-009 has RLS policies, but no explicit table-level
-- GRANT to anon/authenticated/service_role. Supabase normally auto-grants
-- these the moment a table is created via the SQL Editor (through a
-- default-privilege rule scoped to the `postgres` role), but that did not
-- happen for this project's tables — direct queries fail with Postgres
-- error 42501 ("permission denied for table x"), *before* RLS is ever
-- evaluated. RLS policies alone are not sufficient; the role must also be
-- allowed to attempt the operation at all.
--
-- This does not weaken security: RLS stays the actual per-row gate exactly
-- as designed in 001-009. A GRANT only allows a role to attempt a command;
-- whether any row is actually visible/writable is still fully controlled by
-- the policies already in place (and a table with RLS enabled but zero
-- matching policy for a given command silently returns/affects zero rows,
-- e.g. audit_logs has no INSERT policy for anyone, so granting INSERT there
-- changes nothing in practice).

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

-- Make this automatic for any table added by a later migration (009+),
-- scoped to whichever role actually executes this statement (normally
-- `postgres` via the SQL Editor / `supabase db push`).
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
