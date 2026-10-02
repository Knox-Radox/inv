-- The roles and defaults a Supabase project is born with, recreated on a bare
-- Postgres so that supabase/schema.sql is tested against what it will meet.
--
-- TEST ONLY. Never run this on Supabase: the roles already exist there.
--
-- The important part is the last two statements. Supabase grants its API roles
-- every privilege on every new table and function in `public`, and Postgres
-- itself grants EXECUTE on every new function to PUBLIC. schema.sql has to
-- take both away, and a test database that started locked would prove nothing.

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit password 'local';
  end if;
end
$$;

set client_min_messages = warning;
grant anon, authenticated, service_role to authenticator;
grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
