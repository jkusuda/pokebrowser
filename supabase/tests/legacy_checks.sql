-- Run after the migrations. Raises on the first mismatch.
do $$
declare
  ash   constant uuid := 'a5a5a5a5-0000-4000-8000-000000000001';
  misty constant uuid := 'a5a5a5a5-0000-4000-8000-000000000002';
  brock constant uuid := 'b0000000-0000-4000-8000-000000000003';
  gary  constant uuid := 'b0000000-0000-4000-8000-000000000004';

begin
  -- users split
  assert (select theme = 'blue' and not sound_enabled and not encounter_animations_enabled
            and blocked_sites = '{bank.test}' and has_seen_tutorial
          from user_settings where user_id = ash), 'Ash settings';
  assert (select theme = 'green' and sound_enabled from user_settings where user_id = misty), 'Misty default settings';
  assert (select last_catch_at = '2026-11-01 10:00:05+00' and catches_today = 7
            and catches_today_date = '2026-11-01' from user_limits where user_id = ash), 'Ash limits';
  assert (select xp = 3000 from users where id = ash), 'xp kept';
  assert (select count(*) from users) = 4, 'user count';
  assert (select count(*) from user_settings) = 4 and (select count(*) from user_limits) = 4, '1:1 tables';
  assert (select friend_code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}$' and avatar_id = 'red'
          from users where id = gary), 'Gary backfill';

  -- stats
  assert (select count(*) from user_stats) = 4, 'stats row for everyone (Brock backfilled)';
  assert (select total_catches = 12 and longest_streak = 3 from user_stats where user_id = ash), 'Ash streak record';
  assert (select longest_streak = 10 from user_stats where user_id = misty), 'Misty record kept';
  assert (select array_agg(hostname order by hostname) = '{a.test,b.test}'
          from user_sites where user_id = ash), 'Ash sites';
  assert (select array_agg(day order by day)
            = '{2026-10-01,2026-10-02,2026-10-03,2026-10-05,2026-10-06}'::date[]
          from user_active_days where user_id = ash), 'Ash active days incl. last_catch_date';
  assert exists (select 1 from achievement_unlocks
                 where user_id = ash and achievement_id = 'that_sounds_better' and claimed_at is null), 'nickname unlock added';
  assert (select claimed_at = '2026-10-02 00:00+00' from achievement_unlocks
          where user_id = ash and achievement_id = 'identity_crisis'), 'existing unlock untouched';
  assert exists (select 1 from achievement_unlocks where user_id = gary and achievement_id = 'new_look'), 'avatar unlock added';

  -- references
  assert (select count(*) from candies where user_id = ash and family_base_id in (1, 25)) = 2, 'candies renamed';
  assert (select count(*) from pokemon where user_id = ash and encounter_id is null) = 2, 'pokemon kept';
  assert (select type_filter = 'fire' from tokens where user_id = ash), 'token type';

  -- friends
  assert (select count(*) from friends) = 2, 'friend rows after dedupe';
  assert (select status = 'accepted' and user_id = ash from friends
          where least(user_id, friend_id) = least(ash, misty) and greatest(user_id, friend_id) = greatest(ash, misty)),
         'accepted row kept';
  assert (select user_id = brock from friends
          where least(user_id, friend_id) = least(brock, gary) and greatest(user_id, friend_id) = greatest(brock, gary)),
         'older pending kept';

  -- events
  assert (select xp_multiplier = 3 and candy_multiplier = 1.5 and shiny_multiplier = 1
          from events where id = 'e0000000-0000-4000-8000-000000000001'), 'multipliers';
  assert (select sum(count) from event_progress
          where event_id = 'e0000000-0000-4000-8000-000000000001') = 7, 'community progress = sum';
  assert (select count(*) from event_progress
          where event_id = 'e0000000-0000-4000-8000-000000000002') = 0, 'unique progress moved';
  assert (select count(*) from event_species where event_id = 'e0000000-0000-4000-8000-000000000002') = 3, 'event species';

  raise notice 'all carry-over checks passed';
end
$$;
