-- The Go API (role pokebrowser_api) is now the only reader and writer of game
-- data. The public key (anon) and signed-in users (authenticated) lose all
-- table, sequence and function access, except read-own on the tables the
-- profile page's Realtime subscription watches: Realtime only delivers changes
-- a subscriber could select.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from public, anon, authenticated;

drop policy "friends: delete own" on public.friends;
drop policy "friends: insert own" on public.friends;
drop policy "friends: update own" on public.friends;
drop policy "friends: select own" on public.friends;
drop policy "pokemon: delete own" on public.pokemon;
drop policy "pokemon: update own" on public.pokemon;
drop policy "pokemon: select own or buddy" on public.pokemon;
drop policy "users: update own row" on public.users;
drop policy "users: viewable by self or friends" on public.users;
drop policy "users_update_own_tokens" on public.tokens;
drop policy "users_select_own_tokens" on public.tokens;
drop policy "users_select_own_achievement_unlocks" on public.achievement_unlocks;
drop policy "candies: select own" on public.candies;
drop policy "pokedex: select own" on public.pokedex;
drop policy "user_settings: select own" on public.user_settings;
drop policy "users_select_own_stats" on public.user_stats;
drop policy "event_progress: viewable by owner" on public.event_progress;
drop policy "events: viewable by authenticated" on public.events;

grant select on public.users, public.user_settings, public.pokemon, public.pokedex,
  public.candies, public.achievement_unlocks, public.tokens, public.friends to authenticated;

create policy "realtime: own row" on public.users
  for select to authenticated using ((select auth.uid()) = id);
create policy "realtime: own rows" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "realtime: own rows" on public.pokemon
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "realtime: own rows" on public.pokedex
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "realtime: own rows" on public.candies
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "realtime: own rows" on public.achievement_unlocks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "realtime: own rows" on public.tokens
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "realtime: own rows" on public.friends
  for select to authenticated using ((select auth.uid()) in (user_id, friend_id));
