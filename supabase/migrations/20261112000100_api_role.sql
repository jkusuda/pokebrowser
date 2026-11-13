-- Role the Go API connects as. BYPASSRLS because the RLS policies are written
-- for per-user access (auth.uid()); the API enforces ownership itself.
-- Locally the login password comes from supabase/roles.sql.
do $$
begin
  if not exists (select from pg_roles where rolname = 'pokebrowser_api') then
    create role pokebrowser_api nologin;
  end if;
end
$$;

alter role pokebrowser_api bypassrls;

grant usage on schema public to pokebrowser_api;
grant select, insert, update, delete on all tables in schema public to pokebrowser_api;
grant usage, select on all sequences in schema public to pokebrowser_api;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to pokebrowser_api;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to pokebrowser_api;
