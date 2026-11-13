-- Old-schema data covering each carry-over rule. Loaded on top of the seed at
-- the baseline (before 20261112001000).

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-000000000003', 'authenticated',
   'authenticated', 'brock@local.test', '', '{"trainer_name":"Brock"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-000000000004', 'authenticated',
   'authenticated', 'gary@local.test', '', '{"trainer_name":"Gary"}', now(), now(), '', '', '', '');

-- Ash: non-default settings and pacing.
update public.users set
  theme = 'blue', sound_enabled = false, encounter_animations_enabled = false,
  blocked_sites = '{bank.test}', has_seen_tutorial = true,
  last_roll_at = '2026-11-01 10:00+00', last_catch_at = '2026-11-01 10:00:05+00',
  catches_today = 7, catches_today_date = '2026-11-01', level = 3, xp = 3000
where id = 'a5a5a5a5-0000-4000-8000-000000000001';

-- Gary: missing friend code and avatar.
update public.users set friend_code = null, avatar_id = null
where id = 'b0000000-0000-4000-8000-000000000004';

-- Stats. Ash's longest run in active_dates is 3 days (stored 2); last_catch_date
-- isn't in active_dates. Misty's stored record (10) is longer than her history.
-- Brock has no stats row.
insert into public.user_stats (user_id, total_catches, caught_websites, types_caught, active_dates,
  current_streak, longest_streak, last_catch_date, has_nicknamed, trainer_name_changed, avatar_changed)
values
  ('a5a5a5a5-0000-4000-8000-000000000001', 12, '{a.test,b.test,""}', '{grass,electric}',
   '{2026-10-01,2026-10-02,2026-10-03,2026-10-05}', 1, 2, '2026-10-06', true, true, false),
  ('a5a5a5a5-0000-4000-8000-000000000002', 3, '{}', '{}', '{2026-10-01}', 1, 10, '2026-10-01',
   false, false, false),
  ('b0000000-0000-4000-8000-000000000004', 0, '{}', '{}', '{}', 0, 0, null, false, false, true);

-- Ash's name-change achievement already exists (claimed); the nickname one is missing.
insert into public.achievement_unlocks (user_id, achievement_id, claimed_at) values
  ('a5a5a5a5-0000-4000-8000-000000000001', 'identity_crisis', '2026-10-02 00:00+00'),
  ('a5a5a5a5-0000-4000-8000-000000000001', 'first_steps', null);

insert into public.candies (user_id, pokedex_number, count) values
  ('a5a5a5a5-0000-4000-8000-000000000001', 1, 5),
  ('a5a5a5a5-0000-4000-8000-000000000001', 25, 3);

insert into public.pokemon (user_id, pokedex_number, is_shiny, caught_on) values
  ('a5a5a5a5-0000-4000-8000-000000000001', 1, false, 'a.test'),
  ('a5a5a5a5-0000-4000-8000-000000000001', 25, true, 'b.test');

insert into public.pokedex (user_id, pokedex_number) values
  ('a5a5a5a5-0000-4000-8000-000000000001', 1),
  ('a5a5a5a5-0000-4000-8000-000000000001', 25);

-- Friends: Misty's reverse pending request duplicates the accepted pair; Brock
-- and Gary requested each other (older one kept); Brock friended himself.
insert into public.friends (user_id, friend_id, status, created_at) values
  ('a5a5a5a5-0000-4000-8000-000000000002', 'a5a5a5a5-0000-4000-8000-000000000001', 'pending', '2026-09-01'),
  ('b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004', 'pending', '2026-09-02'),
  ('b0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003', 'pending', '2026-09-03'),
  ('b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'pending', '2026-09-04');

-- Events: bonuses with a repeated type (max wins), a community goal with
-- progress, and a unique-species event.
insert into public.events (id, name, starts_at, ends_at, tracked_stat, bonuses, community_goal,
  community_progress, reward_token_type)
values
  ('e0000000-0000-4000-8000-000000000001', 'Catch-a-thon', '2026-11-01', '2026-12-01', 'total_catches',
   '[{"type":"xp_multiplier","value":2,"label":"2x XP"},{"type":"xp_multiplier","value":3,"label":"3x XP"},{"type":"candy_multiplier","value":1.5,"label":"1.5x candy"}]',
   100, 7, 'legendary');
insert into public.events (id, name, starts_at, ends_at, tracked_stat)
values ('e0000000-0000-4000-8000-000000000002', 'Dex Dash', '2026-11-01', '2026-12-01', 'unique_species');

insert into public.event_progress (event_id, user_id, count, species) values
  ('e0000000-0000-4000-8000-000000000001', 'a5a5a5a5-0000-4000-8000-000000000001', 4, '{}'),
  ('e0000000-0000-4000-8000-000000000001', 'a5a5a5a5-0000-4000-8000-000000000002', 3, '{}'),
  ('e0000000-0000-4000-8000-000000000002', 'a5a5a5a5-0000-4000-8000-000000000001', 2, '{1,4}'),
  ('e0000000-0000-4000-8000-000000000002', 'a5a5a5a5-0000-4000-8000-000000000002', 1, '{7}');

insert into public.tokens (user_id, token_type, type_filter) values
  ('a5a5a5a5-0000-4000-8000-000000000001', 'type_pick', 'fire');
