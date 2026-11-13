-- Production objects outside the public schema, which `supabase db dump` skips.

-- Trigger name assumed; confirm with:
--   select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

select cron.schedule(
  'finalize-ended-events',
  '*/5 * * * *',
  $$select public._finalize_ended_events()$$
);
