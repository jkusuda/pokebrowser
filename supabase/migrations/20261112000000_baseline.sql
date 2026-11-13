-- Schema-only dump of production (supabase db dump --linked), 2026-11-12. Kept verbatim.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."_catch_pokemon"("p_user_id" "uuid", "p_pokedex_number" integer, "p_is_shiny" boolean, "p_family_base_id" integer, "p_nickname" "text", "p_caught_on" "text", "p_enforce_cooldown" boolean) RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_count int;
  v_limit int;
  v_user_xp int;
  v_last_catch timestamptz;
  v_catches_today int;
  v_catches_date date;
  v_xp_gained int;
  v_candy_gained int;
  v_new_xp int;
  v_new_level int;
  v_is_new_species bool;
  v_is_legendary bool;
begin
  if p_pokedex_number < 1 or p_pokedex_number > 386 then
    raise exception 'invalid_pokedex_number' using errcode = '22023';
  end if;
  if p_family_base_id < 1 or p_family_base_id > 386 then
    raise exception 'invalid_family_id' using errcode = '22023';
  end if;

  select s.is_legendary into v_is_legendary
    from public.pokemon_species s
    where s.id = p_pokedex_number;

  -- Derived from pokemon_species + pokemon_evolutions; mirrored for display
  -- by packages/pokemon-data/src/xp.ts. +2000 flat shiny bonus.
  v_xp_gained :=
    case
      when coalesce(v_is_legendary, false) then 1000
      when not exists (
        select 1 from public.pokemon_evolutions e where e.from_id = p_pokedex_number
      ) then 300
      when exists (
        select 1 from public.pokemon_evolutions e where e.to_id = p_pokedex_number
      ) then 200
      else 100
    end
    + case when p_is_shiny then 2000 else 0 end;

  -- Active-event bonuses (1 when no event / no bonus of that type applies).
  v_xp_gained := round(v_xp_gained * public._event_bonus_multiplier('xp_multiplier'))::int;
  v_candy_gained := round(3 * public._event_bonus_multiplier('candy_multiplier'))::int;

  -- Lock the user's row to serialize concurrent catches and rate-limit checks.
  select xp, catch_limit, last_catch_at, catches_today, catches_today_date
    into v_user_xp, v_limit, v_last_catch, v_catches_today, v_catches_date
    from public.users
    where id = p_user_id
    for update;

  -- Reject catches that arrive faster than the cooldown window (1.5s),
  -- centralized here so the extension can't bypass it. Token redemptions
  -- pass p_enforce_cooldown = false.
  if p_enforce_cooldown
     and v_last_catch is not null
     and v_last_catch > now() - interval '1500 milliseconds'
  then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- Daily cap: bounds scripted grinding at what a maximally active real
  -- player could reach. Resets at UTC midnight.
  if v_catches_date is distinct from current_date then
    v_catches_today := 0;
  end if;
  if v_catches_today >= 500 then
    raise exception 'daily_limit_reached' using errcode = 'P0001';
  end if;

  if v_limit is null then
    v_limit := 200;
  end if;

  select count(*) into v_count from public.pokemon where user_id = p_user_id;
  if v_count >= v_limit then
    raise exception 'catch_limit_reached' using errcode = 'P0001';
  end if;

  v_is_new_species := not exists (
    select 1 from public.pokedex
    where user_id = p_user_id and pokedex_number = p_pokedex_number
  );
  if v_is_new_species then
    insert into public.pokedex (user_id, pokedex_number)
    values (p_user_id, p_pokedex_number);
  end if;

  insert into public.pokemon (user_id, pokedex_number, nickname, is_shiny, caught_on)
  values (p_user_id, p_pokedex_number, p_nickname, p_is_shiny, p_caught_on);

  insert into public.candies (user_id, pokedex_number, count)
  values (p_user_id, p_family_base_id, v_candy_gained)
  on conflict (user_id, pokedex_number)
  do update set count = candies.count + excluded.count;

  -- Quadratic curve: xp_for_level(n) = 500*n*(n-1), so
  -- level = floor((1 + sqrt(1 + xp/125)) / 2). Catch limit is NOT grown here.
  v_new_xp := coalesce(v_user_xp, 0) + v_xp_gained;
  v_new_level := floor((1 + sqrt(1 + v_new_xp / 125.0)) / 2)::int;

  update public.users
    set xp = v_new_xp,
        level = greatest(v_new_level, 1),
        last_catch_at = now(),
        catches_today = v_catches_today + 1,
        catches_today_date = current_date
    where id = p_user_id;

  return json_build_object('is_new_species', v_is_new_species);
end;
$$;


ALTER FUNCTION "public"."_catch_pokemon"("p_user_id" "uuid", "p_pokedex_number" integer, "p_is_shiny" boolean, "p_family_base_id" integer, "p_nickname" "text", "p_caught_on" "text", "p_enforce_cooldown" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_event_bonus_multiplier"("p_type" "text") RETURNS numeric
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  -- 1 when no event is live / the event has no bonus of this type / the value
  -- is malformed, so every call site degrades to a no-op. Hard-capped at 100
  -- as a last line of defence against int overflow in _catch_pokemon.
  select least(
    coalesce(
      (
        select max((b->>'value')::numeric)
        from public.events e
        cross join lateral jsonb_array_elements(e.bonuses) b
        where e.starts_at <= now() and e.ends_at > now()
          and b->>'type' = p_type
          and jsonb_typeof(b->'value') = 'number'
          and (b->>'value')::numeric > 0
      ),
      1
    ),
    100
  );
$$;


ALTER FUNCTION "public"."_event_bonus_multiplier"("p_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_event_bonuses_valid"("p_bonuses" "jsonb") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  -- CASE (not AND) so jsonb_array_elements is never reached for a non-array.
  select case
    when p_bonuses is null then false
    when jsonb_typeof(p_bonuses) <> 'array' then false
    else not exists (
      select 1
      from jsonb_array_elements(p_bonuses) b
      where coalesce(jsonb_typeof(b), '') <> 'object'
         or coalesce(b->>'type', '') not in
              ('xp_multiplier', 'candy_multiplier', 'shiny_rate_multiplier')
         or coalesce(jsonb_typeof(b->'value'), '') <> 'number'
         or (b->>'value')::numeric <= 0
         or (b->>'value')::numeric > 100
         or coalesce(jsonb_typeof(b->'label'), '') <> 'string'
         or char_length(b->>'label') not between 1 and 30
    )
  end;
$$;


ALTER FUNCTION "public"."_event_bonuses_valid"("p_bonuses" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_finalize_ended_events"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_event_id uuid;
  v_finalized int := 0;
begin
  for v_event_id in
    select id from public.events
    where ends_at <= now() and finalized_at is null
    order by ends_at
    for update skip locked
  loop
    insert into public.achievement_unlocks (user_id, achievement_id)
      select r.user_id, 'event_champion'
      from (
        select ep.user_id, rank() over (order by ep.count desc) as rnk
        from public.event_progress ep
        where ep.event_id = v_event_id and ep.count > 0
      ) r
      where r.rnk <= 3
    on conflict (user_id, achievement_id) do nothing;

    update public.events set finalized_at = now() where id = v_event_id;
    v_finalized := v_finalized + 1;
  end loop;
  return v_finalized;
end;
$$;


ALTER FUNCTION "public"."_finalize_ended_events"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "tracked_stat" "text" NOT NULL,
    "type_filter" "text",
    "bonuses" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "spotlight_pokedex" integer,
    "spotlight_rate" numeric,
    "boosted_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "type_boost" numeric DEFAULT 1 NOT NULL,
    "community_goal" integer,
    "community_progress" integer DEFAULT 0 NOT NULL,
    "goal_reached_at" timestamp with time zone,
    "reward_token_type" "text",
    "reward_pokedex" integer,
    "boosted_generations" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "generation_boost" numeric DEFAULT 1 NOT NULL,
    "finalized_at" timestamp with time zone,
    CONSTRAINT "events_bonuses_check" CHECK (("jsonb_typeof"("bonuses") = 'array'::"text")),
    CONSTRAINT "events_boosted_generations_valid" CHECK (("boosted_generations" <@ ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9])),
    CONSTRAINT "events_boosted_types_valid" CHECK ((("cardinality"("boosted_types") <= 3) AND ("boosted_types" <@ ARRAY['normal'::"text", 'fire'::"text", 'water'::"text", 'electric'::"text", 'grass'::"text", 'ice'::"text", 'fighting'::"text", 'poison'::"text", 'ground'::"text", 'flying'::"text", 'psychic'::"text", 'bug'::"text", 'rock'::"text", 'ghost'::"text", 'dragon'::"text", 'dark'::"text", 'steel'::"text", 'fairy'::"text"]))),
    CONSTRAINT "events_community_goal_positive" CHECK ((("community_goal" IS NULL) OR ("community_goal" > 0))),
    CONSTRAINT "events_community_progress_nonneg" CHECK (("community_progress" >= 0)),
    CONSTRAINT "events_description_check" CHECK (("char_length"("description") <= 500)),
    CONSTRAINT "events_generation_boost_range" CHECK ((("generation_boost" >= (1)::numeric) AND ("generation_boost" <= (20)::numeric) AND (("cardinality"("boosted_generations") = 0) = ("generation_boost" = (1)::numeric)))),
    CONSTRAINT "events_goal_reached_needs_goal" CHECK ((("goal_reached_at" IS NULL) OR ("community_goal" IS NOT NULL))),
    CONSTRAINT "events_name_check" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 60))),
    CONSTRAINT "events_reward_consistent" CHECK ((("community_goal" IS NULL) = ("reward_token_type" IS NULL))),
    CONSTRAINT "events_reward_species_consistent" CHECK ((COALESCE(("reward_token_type" = 'species'::"text"), false) = ("reward_pokedex" IS NOT NULL))),
    CONSTRAINT "events_reward_token_type_valid" CHECK ((("reward_token_type" IS NULL) OR ("reward_token_type" = ANY (ARRAY['legendary'::"text", 'mythical'::"text", 'shiny'::"text", 'type_pick'::"text", 'species'::"text"])))),
    CONSTRAINT "events_spotlight_consistent" CHECK ((("spotlight_pokedex" IS NULL) = ("spotlight_rate" IS NULL))),
    CONSTRAINT "events_spotlight_rate_range" CHECK ((("spotlight_rate" IS NULL) OR (("spotlight_rate" > (0)::numeric) AND ("spotlight_rate" <= 0.9)))),
    CONSTRAINT "events_tracked_stat_check" CHECK (("tracked_stat" = ANY (ARRAY['total_catches'::"text", 'shiny_catches'::"text", 'type_catches'::"text", 'evolutions'::"text", 'unique_species'::"text"]))),
    CONSTRAINT "events_type_boost_range" CHECK ((("type_boost" >= (1)::numeric) AND ("type_boost" <= (20)::numeric) AND (("cardinality"("boosted_types") = 0) = ("type_boost" = (1)::numeric)))),
    CONSTRAINT "events_type_filter_check" CHECK ((("type_filter" IS NULL) OR ("type_filter" = ANY (ARRAY['normal'::"text", 'fire'::"text", 'water'::"text", 'electric'::"text", 'grass'::"text", 'ice'::"text", 'fighting'::"text", 'poison'::"text", 'ground'::"text", 'flying'::"text", 'psychic'::"text", 'bug'::"text", 'rock'::"text", 'ghost'::"text", 'dragon'::"text", 'dark'::"text", 'steel'::"text", 'fairy'::"text"])))),
    CONSTRAINT "events_type_filter_consistent" CHECK ((("tracked_stat" = 'type_catches'::"text") = ("type_filter" IS NOT NULL))),
    CONSTRAINT "events_window_valid" CHECK (("ends_at" > "starts_at"))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_grant_event_reward"("p_event" "public"."events", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  insert into public.tokens (user_id, token_type, pokedex_number, event_id)
  values (p_user_id, p_event.reward_token_type, p_event.reward_pokedex, p_event.id)
  on conflict (user_id, event_id) where event_id is not null do nothing;

  insert into public.achievement_unlocks (user_id, achievement_id)
  values (p_user_id, 'team_player')
  on conflict (user_id, achievement_id) do nothing;
$$;


ALTER FUNCTION "public"."_grant_event_reward"("p_event" "public"."events", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_maybe_complete_community_goal"("p_event_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_event public.events;
begin
  update public.events
    set goal_reached_at = now()
    where id = p_event_id
      and goal_reached_at is null
      and community_goal is not null
      and community_progress >= community_goal
    returning * into v_event;
  if not found then
    return false;
  end if;

  insert into public.tokens (user_id, token_type, pokedex_number, event_id)
    select ep.user_id, v_event.reward_token_type, v_event.reward_pokedex, v_event.id
    from public.event_progress ep
    where ep.event_id = v_event.id and ep.count > 0
  on conflict (user_id, event_id) where event_id is not null do nothing;

  insert into public.achievement_unlocks (user_id, achievement_id)
    select ep.user_id, 'team_player'
    from public.event_progress ep
    where ep.event_id = v_event.id and ep.count > 0
  on conflict (user_id, achievement_id) do nothing;
  return true;
end;
$$;


ALTER FUNCTION "public"."_maybe_complete_community_goal"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_pokemon_display_name"("p_name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select case p_name
    when 'nidoran-f' then 'Nidoran♀'
    when 'nidoran-m' then 'Nidoran♂'
    when 'mr-mime'   then 'Mr. Mime'
    when 'farfetchd' then 'Farfetch''d'
    when 'ho-oh'     then 'Ho-Oh'
    when 'porygon2'  then 'Porygon2'
    when 'deoxys-normal' then 'Deoxys'
    else upper(left(p_name, 1)) || replace(substr(p_name, 2), '-', ' ')
  end;
$$;


ALTER FUNCTION "public"."_pokemon_display_name"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_record_event_progress"("p_user_id" "uuid", "p_kind" "text", "p_is_shiny" boolean, "p_types" "text"[], "p_pokedex_number" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_event public.events;
  v_scored boolean;
begin
  for v_event in
    select * from public.events
    where starts_at <= now() and ends_at > now()
    order by id
  loop
    v_scored := false;

    if v_event.tracked_stat = 'unique_species' then
      if p_kind <> 'catch' then
        continue;
      end if;
      insert into public.event_progress (event_id, user_id, count, species)
        values (v_event.id, p_user_id, 1, array[p_pokedex_number])
        on conflict (event_id, user_id) do update
          set count = event_progress.count + 1,
              species = event_progress.species || excluded.species,
              updated_at = now()
          where not (p_pokedex_number = any(event_progress.species));
      -- FOUND is false when the WHERE above suppressed a repeat species.
      v_scored := found;
    elsif (v_event.tracked_stat = 'total_catches' and p_kind = 'catch')
       or (v_event.tracked_stat = 'shiny_catches' and p_kind = 'catch' and p_is_shiny)
       or (v_event.tracked_stat = 'type_catches' and p_kind = 'catch'
           and v_event.type_filter = any(coalesce(p_types, '{}')))
       or (v_event.tracked_stat = 'evolutions' and p_kind = 'evolve')
    then
      insert into public.event_progress (event_id, user_id, count)
        values (v_event.id, p_user_id, 1)
        on conflict (event_id, user_id) do update
          set count = event_progress.count + 1,
              updated_at = now();
      v_scored := true;
    end if;

    if not v_scored or v_event.community_goal is null then
      continue;
    end if;

    -- Row lock serializes concurrent scorers, so whoever waits here sees the
    -- winner's goal_reached_at and rewards themselves below.
    update public.events
      set community_progress = community_progress + 1
      where id = v_event.id
      returning * into v_event;

    if v_event.goal_reached_at is not null then
      perform public._grant_event_reward(v_event, p_user_id);
    else
      perform public._maybe_complete_community_goal(v_event.id);
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."_record_event_progress"("p_user_id" "uuid", "p_kind" "text", "p_is_shiny" boolean, "p_types" "text"[], "p_pokedex_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_roll_wild_species"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_spotlight_share double precision;
  v_id int;
begin
  -- Spotlights share one slot: the combined chance is the sum of the live
  -- spotlight rates, capped at 0.9 (the same ceiling one event can have), and
  -- a hit picks among them in proportion to their rates.
  select least(coalesce(sum(spotlight_rate), 0), 0.9) into v_spotlight_share
    from public.events
    where starts_at <= now() and ends_at > now()
      and spotlight_pokedex is not null;

  if v_spotlight_share > 0 and random() < v_spotlight_share then
    select spotlight_pokedex into v_id from public.events
      where starts_at <= now() and ends_at > now()
        and spotlight_pokedex is not null
      order by -ln(1 - random()) / spotlight_rate
      limit 1;
    return v_id;
  end if;

  if exists (
    select 1 from public.events
    where starts_at <= now() and ends_at > now()
      and (cardinality(boosted_types) > 0 or cardinality(boosted_generations) > 0)
  ) then
    -- A species' weight is the product, across every live event, of that
    -- event's type boost (if the species has a boosted type) and generation
    -- boost (if it's from a boosted generation): Fire x3 + Gen 2 x2 in one
    -- event and Water x2 in another = x12 for a Gen 2 Fire/Water.
    select s.id into v_id
      from public.pokemon_species s
      cross join lateral (
        select exp(coalesce(sum(ln(
                 case when s.types && e.boosted_types then e.type_boost else 1 end
               * case when s.generation = any(e.boosted_generations) then e.generation_boost else 1 end
               )), 0)) as weight
          from public.events e
          where e.starts_at <= now() and e.ends_at > now()
      ) w
      where not s.is_mythical
      order by -ln(1 - random()) / w.weight
      limit 1;
  else
    select id into v_id from public.pokemon_species
      where not is_mythical
      order by random()
      limit 1;
  end if;
  return v_id;
end;
$$;


ALTER FUNCTION "public"."_roll_wild_species"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_try_unlock_achievement"("p_user_id" "uuid", "p_achievement_id" "text", "p_condition" boolean) RETURNS "text"[]
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT p_condition THEN
    RETURN '{}';
  END IF;

  INSERT INTO achievement_unlocks (user_id, achievement_id)
  VALUES (p_user_id, p_achievement_id)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    RETURN ARRAY[p_achievement_id];
  ELSE
    RETURN '{}';
  END IF;
END;
$$;


ALTER FUNCTION "public"."_try_unlock_achievement"("p_user_id" "uuid", "p_achievement_id" "text", "p_condition" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_update_catch_stats"("p_user_id" "uuid", "p_is_shiny" boolean, "p_is_legendary" boolean, "p_types" "text"[], "p_caught_on" "text") RETURNS "text"[]
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_current_streak int;
  v_longest_streak int;
  v_last_date      date;
  v_total_catches  int;
  v_websites       text[];
  v_types          text[];
  v_active_dates   date[];
  v_unique_sites   int;
  v_types_count    int;
  v_level          int;
  v_pokedex_count  int;
  v_kanto_count    int;
  v_johto_count    int;
  v_hoenn_count    int;
  v_shiny_dex      int;
  v_newly_unlocked text[] := '{}';
begin
  insert into user_stats (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select
    current_streak, longest_streak, last_catch_date,
    total_catches, caught_websites, types_caught, active_dates
  into
    v_current_streak, v_longest_streak, v_last_date,
    v_total_catches, v_websites, v_types, v_active_dates
  from user_stats
  where user_id = p_user_id
  for update;

  if v_last_date is null then
    v_current_streak := 1;
    v_longest_streak := 1;
    v_last_date      := current_date;
  elsif v_last_date = current_date then
    null;
  elsif v_last_date = current_date - interval '1 day' then
    v_current_streak := v_current_streak + 1;
    if v_current_streak > v_longest_streak then
      v_longest_streak := v_current_streak;
    end if;
    v_last_date := current_date;
  else
    v_current_streak := 1;
    v_last_date      := current_date;
  end if;

  -- Record today as an active day (persists even if the caught Pokémon is later released)
  if not (current_date = any(v_active_dates)) then
    v_active_dates := array_append(v_active_dates, current_date);
  end if;

  v_total_catches := v_total_catches + 1;

  if p_caught_on is not null and not (p_caught_on = any(v_websites)) then
    v_websites := array_append(v_websites, p_caught_on);
  end if;

  if p_types is not null and array_length(p_types, 1) > 0 then
    select array_agg(distinct elem) into v_types
    from (
      select unnest(v_types) as elem
      union
      select unnest(p_types) as elem
    ) sub;
  end if;

  update user_stats set
    total_catches   = v_total_catches,
    caught_websites = v_websites,
    types_caught    = v_types,
    active_dates    = v_active_dates,
    current_streak  = v_current_streak,
    longest_streak  = v_longest_streak,
    last_catch_date = v_last_date,
    updated_at      = now()
  where user_id = p_user_id;

  select level into v_level from users where id = p_user_id;

  select count(*) into v_pokedex_count
  from pokedex where user_id = p_user_id;

  select count(*) into v_kanto_count
  from pokedex where user_id = p_user_id and pokedex_number between 1 and 151;

  select count(*) into v_johto_count
  from pokedex where user_id = p_user_id and pokedex_number between 152 and 251;

  select count(*) into v_hoenn_count
  from pokedex where user_id = p_user_id and pokedex_number between 252 and 386;

  -- shiny_hunter stays a Kanto-only goal, so this must be range-scoped —
  -- otherwise 151 distinct shinies spread across both regions would earn it.
  select count(distinct pokedex_number) into v_shiny_dex
  from pokemon
  where user_id = p_user_id and is_shiny = true and pokedex_number <= 151;

  v_unique_sites := coalesce(array_length(v_websites, 1), 0);
  v_types_count  := coalesce(array_length(v_types, 1), 0);

  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'first_steps',      v_total_catches >= 1);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'getting_started',  v_total_catches >= 10);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'collector',        v_total_catches >= 100);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'master_collector', v_total_catches >= 1000);

  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'explorer',   v_unique_sites >= 10);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'web_surfer', v_unique_sites >= 100);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'netizen',    v_unique_sites >= 1000);

  if p_is_shiny then
    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'lucky_color', true);
  end if;

  if p_is_legendary then
    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'legendary_encounter', true);
  end if;

  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'kanto_complete',     v_kanto_count >= 151);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'johto_complete',     v_johto_count >= 100);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'hoenn_complete',     v_hoenn_count >= 135);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'gotta_catch_em_all', v_pokedex_count >= 386);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'shiny_hunter',       v_shiny_dex >= 151);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'just_my_type',       v_types_count >= 18);

  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'dedicated',        v_current_streak >= 7);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'love_of_the_game', v_current_streak >= 30);

  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'level_5',  v_level >= 5);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'level_10', v_level >= 10);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'level_20', v_level >= 20);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'level_30', v_level >= 30);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'level_40', v_level >= 40);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(p_user_id, 'level_50', v_level >= 50);

  return v_newly_unlocked;
end;
$$;


ALTER FUNCTION "public"."_update_catch_stats"("p_user_id" "uuid", "p_is_shiny" boolean, "p_is_legendary" boolean, "p_types" "text"[], "p_caught_on" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_validate_event_modifiers"("p_spotlight_pokedex" integer, "p_spotlight_rate" numeric, "p_boosted_types" "text"[], "p_type_boost" numeric, "p_boosted_generations" integer[], "p_generation_boost" numeric, "p_community_goal" integer, "p_reward_token_type" "text", "p_reward_pokedex" integer) RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- Mythicals stay token-only, so they can't be spotlighted.
  if (p_spotlight_pokedex is null) <> (p_spotlight_rate is null)
     or (p_spotlight_rate is not null and not (p_spotlight_rate > 0 and p_spotlight_rate <= 0.9))
     or (p_spotlight_pokedex is not null and not exists (
           select 1 from public.pokemon_species
           where id = p_spotlight_pokedex and not is_mythical))
  then
    raise exception 'invalid_spotlight' using errcode = 'P0001';
  end if;

  if p_boosted_types is null or p_type_boost is null
     or cardinality(p_boosted_types) > 3
     or not (p_boosted_types <@ array[
       'normal','fire','water','electric','grass','ice','fighting','poison','ground',
       'flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']::text[])
     or (select count(distinct t) from unnest(p_boosted_types) t) <> cardinality(p_boosted_types)
     or p_type_boost < 1 or p_type_boost > 20
     or (cardinality(p_boosted_types) = 0) <> (p_type_boost = 1)
  then
    raise exception 'invalid_type_boost' using errcode = 'P0001';
  end if;

  -- Only generations we actually ship species for.
  if p_boosted_generations is null or p_generation_boost is null
     or not (p_boosted_generations <@ (select array_agg(distinct generation) from public.pokemon_species))
     or (select count(distinct g) from unnest(p_boosted_generations) g) <> cardinality(p_boosted_generations)
     or p_generation_boost < 1 or p_generation_boost > 20
     or (cardinality(p_boosted_generations) = 0) <> (p_generation_boost = 1)
  then
    raise exception 'invalid_generation_boost' using errcode = 'P0001';
  end if;

  if p_community_goal is not null and p_community_goal <= 0 then
    raise exception 'invalid_community_goal' using errcode = 'P0001';
  end if;

  if (p_community_goal is null) <> (p_reward_token_type is null)
     or (p_reward_token_type is not null
         and p_reward_token_type not in ('legendary','mythical','shiny','type_pick','species'))
     or coalesce(p_reward_token_type = 'species', false) <> (p_reward_pokedex is not null)
     or (p_reward_pokedex is not null and not exists (
           select 1 from public.pokemon_species where id = p_reward_pokedex))
  then
    raise exception 'invalid_reward' using errcode = 'P0001';
  end if;
end;
$$;


ALTER FUNCTION "public"."_validate_event_modifiers"("p_spotlight_pokedex" integer, "p_spotlight_rate" numeric, "p_boosted_types" "text"[], "p_type_boost" numeric, "p_boosted_generations" integer[], "p_generation_boost" numeric, "p_community_goal" integer, "p_reward_token_type" "text", "p_reward_pokedex" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_action_achievements"("p_trigger" "text", "p_other_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "text"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id        uuid;
  v_newly_unlocked text[] := '{}';
  v_friend_count   int;
  v_other_friend_count int;
  v_total_releases int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO user_stats (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_trigger = 'release' THEN
    UPDATE user_stats
    SET total_releases = total_releases + 1, updated_at = now()
    WHERE user_id = v_user_id
    RETURNING total_releases INTO v_total_releases;
    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'letting_go', v_total_releases >= 1);

  ELSIF p_trigger = 'nickname' THEN
    UPDATE user_stats
    SET has_nicknamed = true, updated_at = now()
    WHERE user_id = v_user_id;
    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'that_sounds_better', true);

  ELSIF p_trigger = 'friend_accept' THEN
    SELECT COUNT(*) INTO v_friend_count
    FROM friends
    WHERE (user_id = v_user_id OR friend_id = v_user_id)
      AND status = 'accepted';
    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'friendly',         v_friend_count >= 1);
    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'social_butterfly', v_friend_count >= 10);

    -- Also unlock for the other party in the friendship (e.g. the original
    -- sender, who never calls this route themselves). Only proceed if a real
    -- accepted friendship exists between the two, so a caller can't pass an
    -- arbitrary id to unlock achievements for someone else.
    IF p_other_user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM friends
      WHERE status = 'accepted'
        AND ((user_id = v_user_id AND friend_id = p_other_user_id)
          OR (user_id = p_other_user_id AND friend_id = v_user_id))
    ) THEN
      SELECT COUNT(*) INTO v_other_friend_count
      FROM friends
      WHERE (user_id = p_other_user_id OR friend_id = p_other_user_id)
        AND status = 'accepted';
      PERFORM _try_unlock_achievement(p_other_user_id, 'friendly',         v_other_friend_count >= 1);
      PERFORM _try_unlock_achievement(p_other_user_id, 'social_butterfly', v_other_friend_count >= 10);
    END IF;

  ELSIF p_trigger = 'trainer_name_change' THEN
    UPDATE user_stats
    SET trainer_name_changed = true, updated_at = now()
    WHERE user_id = v_user_id;
    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'identity_crisis', true);

  ELSIF p_trigger = 'avatar_change' THEN
    UPDATE user_stats
    SET avatar_changed = true, updated_at = now()
    WHERE user_id = v_user_id;
    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'new_look', true);

  END IF;

  RETURN v_newly_unlocked;
END;
$$;


ALTER FUNCTION "public"."check_action_achievements"("p_trigger" "text", "p_other_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_achievement"("p_achievement_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user uuid := auth.uid();
  v_storage integer;
  v_token text;
  v_xp integer;
  v_token_id uuid;
  v_updated integer;
begin
  if v_user is null then
    raise exception 'unauthenticated';
  end if;

  select r.storage_reward, r.token_reward, r.xp_reward
    into v_storage, v_token, v_xp
  from (values
    ('first_steps'::text,      50, null::text,    500),
    ('getting_started',       100, null,         1000),
    ('collector',             250, 'type_pick',  5000),
    ('master_collector',      500, 'legendary', 25000),
    ('explorer',              100, null,         1000),
    ('web_surfer',            250, null,         5000),
    ('netizen',               500, 'legendary', 25000),
    ('letting_go',              0, null,          250),
    ('that_sounds_better',      0, null,          250),
    ('friendly',               50, null,          500),
    ('social_butterfly',        0, null,         2500),
    ('just_my_type',          250, 'type_pick',  5000),
    ('dedicated',             100, null,         2500),
    ('love_of_the_game',      500, 'legendary', 15000),
    ('kanto_complete',        500, 'legendary', 25000),
    ('johto_complete',        500, 'legendary', 25000),
    ('hoenn_complete',        500, 'legendary', 25000),
    ('gotta_catch_em_all',      0, 'shiny',     50000),
    ('lucky_color',             0, null,         2500),
    ('shiny_hunter',         2500, 'mythical', 100000),
    ('identity_crisis',         0, null,          250),
    ('new_look',                0, null,          250),
    ('level_5',               100, null,         1000),
    ('level_10',              150, 'type_pick',  2500),
    ('level_20',              250, 'type_pick',  5000),
    ('level_30',              375, 'type_pick', 10000),
    ('level_40',              500, 'type_pick', 15000),
    ('level_50',              750, 'legendary', 25000),
    ('legendary_encounter',     0, null,         5000),
    ('team_player',             0, null,         5000),
    ('event_champion',          0, 'legendary', 15000)
  ) as r(achievement_id, storage_reward, token_reward, xp_reward)
  where r.achievement_id = p_achievement_id;

  if not found then
    raise exception 'unknown_achievement';
  end if;

  update achievement_unlocks
     set claimed_at = now()
   where user_id = v_user
     and achievement_id = p_achievement_id
     and claimed_at is null;
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    if exists (
      select 1 from achievement_unlocks
       where user_id = v_user and achievement_id = p_achievement_id
    ) then
      raise exception 'already_claimed';
    else
      raise exception 'achievement_not_found';
    end if;
  end if;

  if v_storage > 0 or v_xp > 0 then
    update users
       set catch_limit = catch_limit + v_storage,
           xp = xp + v_xp,
           level = greatest(floor((1 + sqrt(1 + (xp + v_xp) / 125.0)) / 2)::int, 1)
     where id = v_user;
  end if;

  if v_token is not null then
    insert into tokens (user_id, token_type, type_filter)
    values (v_user, v_token, null)
    returning id into v_token_id;
  end if;

  return jsonb_build_object(
    'storage_granted', v_storage,
    'token_granted', v_token,
    'token_id', v_token_id,
    'xp_granted', v_xp
  );
end;
$$;


ALTER FUNCTION "public"."claim_achievement"("p_achievement_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_candy_reward"("p_pokedex_number" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user uuid := auth.uid();
  v_family integer;
  v_updated integer;
begin
  if v_user is null then
    raise exception 'unauthenticated';
  end if;

  if p_pokedex_number is null or p_pokedex_number < 1 or p_pokedex_number > 386 then
    raise exception 'invalid_pokedex_number';
  end if;

  if not exists (
    select 1 from pokedex
     where user_id = v_user and pokedex_number = p_pokedex_number
  ) then
    raise exception 'species_not_unlocked';
  end if;

  -- Candy pools are keyed by the family's base Pokemon id.
  select family_base_id into v_family
    from pokemon_species
   where id = p_pokedex_number;
  v_family := coalesce(v_family, p_pokedex_number);

  update users
     set unclaimed_candy_levels = unclaimed_candy_levels - 1
   where id = v_user
     and unclaimed_candy_levels > 0;
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'no_pending_candy';
  end if;

  insert into candies (user_id, pokedex_number, count)
  values (v_user, v_family, 10)
  on conflict (user_id, pokedex_number)
  do update set count = candies.count + 10;
end;
$$;


ALTER FUNCTION "public"."claim_candy_reward"("p_pokedex_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dev_add_xp"("p_amount" integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_user_xp int;
  v_new_xp int;
  v_new_level int;
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;

  if not exists (select 1 from public.users where id = v_uid and is_admin) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if p_amount < 1 or p_amount > 1000000 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  select xp into v_user_xp from public.users where id = v_uid for update;

  v_new_xp := coalesce(v_user_xp, 0) + p_amount;
  v_new_level := floor((1 + sqrt(1 + v_new_xp / 125.0)) / 2)::int;

  update public.users
    set xp = v_new_xp,
        level = greatest(v_new_level, 1)
    where id = v_uid;

  return json_build_object('xp', v_new_xp, 'level', greatest(v_new_level, 1));
end;
$$;


ALTER FUNCTION "public"."dev_add_xp"("p_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dev_create_event"("p_name" "text", "p_description" "text", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_tracked_stat" "text", "p_type_filter" "text" DEFAULT NULL::"text", "p_bonuses" "jsonb" DEFAULT '[]'::"jsonb", "p_spotlight_pokedex" integer DEFAULT NULL::integer, "p_spotlight_rate" numeric DEFAULT NULL::numeric, "p_boosted_types" "text"[] DEFAULT '{}'::"text"[], "p_type_boost" numeric DEFAULT 1, "p_community_goal" integer DEFAULT NULL::integer, "p_reward_token_type" "text" DEFAULT NULL::"text", "p_reward_pokedex" integer DEFAULT NULL::integer, "p_boosted_generations" integer[] DEFAULT '{}'::integer[], "p_generation_boost" numeric DEFAULT 1) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.users where id = v_uid and is_admin) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'invalid_window' using errcode = 'P0001';
  end if;
  if p_tracked_stat is null or p_tracked_stat not in
     ('total_catches','shiny_catches','type_catches','evolutions','unique_species') then
    raise exception 'invalid_tracked_stat' using errcode = 'P0001';
  end if;
  if (p_tracked_stat = 'type_catches') <> (p_type_filter is not null) then
    raise exception 'invalid_type_filter' using errcode = 'P0001';
  end if;
  if not public._event_bonuses_valid(p_bonuses) then
    raise exception 'invalid_bonuses' using errcode = 'P0001';
  end if;
  perform public._validate_event_modifiers(
    p_spotlight_pokedex, p_spotlight_rate, p_boosted_types, p_type_boost,
    p_boosted_generations, p_generation_boost,
    p_community_goal, p_reward_token_type, p_reward_pokedex
  );

  insert into public.events (
    name, description, starts_at, ends_at, tracked_stat, type_filter, bonuses,
    spotlight_pokedex, spotlight_rate, boosted_types, type_boost,
    boosted_generations, generation_boost,
    community_goal, reward_token_type, reward_pokedex
  )
  values (
    p_name, coalesce(p_description, ''), p_starts_at, p_ends_at,
    p_tracked_stat, p_type_filter, p_bonuses,
    p_spotlight_pokedex, p_spotlight_rate, p_boosted_types, p_type_boost,
    p_boosted_generations, p_generation_boost,
    p_community_goal, p_reward_token_type, p_reward_pokedex
  )
  returning id into v_id;
  return v_id;
end;
$$;


ALTER FUNCTION "public"."dev_create_event"("p_name" "text", "p_description" "text", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_tracked_stat" "text", "p_type_filter" "text", "p_bonuses" "jsonb", "p_spotlight_pokedex" integer, "p_spotlight_rate" numeric, "p_boosted_types" "text"[], "p_type_boost" numeric, "p_community_goal" integer, "p_reward_token_type" "text", "p_reward_pokedex" integer, "p_boosted_generations" integer[], "p_generation_boost" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dev_delete_event"("p_event_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.users where id = v_uid and is_admin) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  delete from public.events where id = p_event_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
end;
$$;


ALTER FUNCTION "public"."dev_delete_event"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dev_grant_token"("p_token_type" "text", "p_type_filter" "text" DEFAULT NULL::"text", "p_pokedex_number" integer DEFAULT NULL::integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;

  if not exists (select 1 from public.users where id = v_uid and is_admin) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if p_token_type not in ('legendary', 'mythical', 'type_pick', 'shiny', 'species') then
    raise exception 'invalid_token_type' using errcode = '22023';
  end if;
  if (p_token_type = 'species') <> (p_pokedex_number is not null)
     or (p_pokedex_number is not null
         and not exists (select 1 from public.pokemon_species where id = p_pokedex_number)) then
    raise exception 'invalid_pokedex_number' using errcode = '22023';
  end if;

  insert into public.tokens (user_id, token_type, type_filter, pokedex_number)
  values (v_uid, p_token_type, p_type_filter, p_pokedex_number);
end;
$$;


ALTER FUNCTION "public"."dev_grant_token"("p_token_type" "text", "p_type_filter" "text", "p_pokedex_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dev_unlock_achievement"("p_achievement_id" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;

  if not exists (select 1 from public.users where id = v_uid and is_admin) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  return public._try_unlock_achievement(v_uid, p_achievement_id, true);
end;
$$;


ALTER FUNCTION "public"."dev_unlock_achievement"("p_achievement_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dev_update_event"("p_event_id" "uuid", "p_name" "text", "p_description" "text", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_tracked_stat" "text", "p_type_filter" "text" DEFAULT NULL::"text", "p_bonuses" "jsonb" DEFAULT '[]'::"jsonb", "p_spotlight_pokedex" integer DEFAULT NULL::integer, "p_spotlight_rate" numeric DEFAULT NULL::numeric, "p_boosted_types" "text"[] DEFAULT '{}'::"text"[], "p_type_boost" numeric DEFAULT 1, "p_community_goal" integer DEFAULT NULL::integer, "p_reward_token_type" "text" DEFAULT NULL::"text", "p_reward_pokedex" integer DEFAULT NULL::integer, "p_boosted_generations" integer[] DEFAULT '{}'::integer[], "p_generation_boost" numeric DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_old public.events%rowtype;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.users where id = v_uid and is_admin) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  -- FOR UPDATE: concurrent scorers queue behind this edit, so the
  -- community_progress resync below can't lose an increment.
  select * into v_old from public.events where id = p_event_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'invalid_window' using errcode = 'P0001';
  end if;
  if p_tracked_stat is null or p_tracked_stat not in
     ('total_catches','shiny_catches','type_catches','evolutions','unique_species') then
    raise exception 'invalid_tracked_stat' using errcode = 'P0001';
  end if;
  if (p_tracked_stat = 'type_catches') <> (p_type_filter is not null) then
    raise exception 'invalid_type_filter' using errcode = 'P0001';
  end if;
  if not public._event_bonuses_valid(p_bonuses) then
    raise exception 'invalid_bonuses' using errcode = 'P0001';
  end if;
  perform public._validate_event_modifiers(
    p_spotlight_pokedex, p_spotlight_rate, p_boosted_types, p_type_boost,
    p_boosted_generations, p_generation_boost,
    p_community_goal, p_reward_token_type, p_reward_pokedex
  );
  -- Rewards already handed out can't be re-scored or swapped.
  if v_old.goal_reached_at is not null and (
       v_old.tracked_stat is distinct from p_tracked_stat
    or v_old.type_filter is distinct from p_type_filter
    or v_old.community_goal is distinct from p_community_goal
    or v_old.reward_token_type is distinct from p_reward_token_type
    or v_old.reward_pokedex is distinct from p_reward_pokedex
  ) then
    raise exception 'goal_already_reached' using errcode = 'P0001';
  end if;

  update public.events
    set name = p_name,
        description = coalesce(p_description, ''),
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        tracked_stat = p_tracked_stat,
        type_filter = p_type_filter,
        bonuses = p_bonuses,
        spotlight_pokedex = p_spotlight_pokedex,
        spotlight_rate = p_spotlight_rate,
        boosted_types = p_boosted_types,
        type_boost = p_type_boost,
        boosted_generations = p_boosted_generations,
        generation_boost = p_generation_boost,
        community_goal = p_community_goal,
        reward_token_type = p_reward_token_type,
        reward_pokedex = p_reward_pokedex
    where id = p_event_id;

  -- Scores earned under the old rule are meaningless under the new one (and
  -- the species[] dedup array only applies to unique_species), so restart the
  -- board whenever the scoring rule itself changes.
  if v_old.tracked_stat is distinct from p_tracked_stat
     or v_old.type_filter is distinct from p_type_filter then
    delete from public.event_progress where event_id = p_event_id;
  end if;

  -- Resync the counter from the board: catches aren't counted while an event
  -- has no goal, so a goal added mid-event starts from the real total.
  update public.events
    set community_progress = (
      select coalesce(sum(count), 0)::int from public.event_progress where event_id = p_event_id
    )
    where id = p_event_id;

  -- A lowered goal may already be met.
  perform public._maybe_complete_community_goal(p_event_id);
end;
$$;


ALTER FUNCTION "public"."dev_update_event"("p_event_id" "uuid", "p_name" "text", "p_description" "text", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_tracked_stat" "text", "p_type_filter" "text", "p_bonuses" "jsonb", "p_spotlight_pokedex" integer, "p_spotlight_rate" numeric, "p_boosted_types" "text"[], "p_type_boost" numeric, "p_community_goal" integer, "p_reward_token_type" "text", "p_reward_pokedex" integer, "p_boosted_generations" integer[], "p_generation_boost" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."evolve_pokemon"("p_pokemon_id" "uuid", "p_target_id" integer DEFAULT NULL::integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_current int;
  v_to int;
  v_cost int;
  v_family int;
  v_candy int;
  v_is_new_species bool;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  select pokedex_number into v_current
    from public.pokemon
    where id = p_pokemon_id and user_id = v_uid
    for update;
  if v_current is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  -- A supplied target must be a real edge from this species; otherwise fall
  -- back to the canonical (lowest-numbered) one.
  select e.to_id, e.candy_cost
    into v_to, v_cost
  from public.pokemon_evolutions e
  where e.from_id = v_current
    and (p_target_id is null or e.to_id = p_target_id)
  order by e.to_id
  limit 1;

  if v_to is null then
    raise exception 'not_evolvable' using errcode = 'P0001';
  end if;

  select family_base_id into v_family
    from public.pokemon_species
    where id = v_current;
  v_family := coalesce(v_family, v_current);

  select count into v_candy
    from public.candies
    where user_id = v_uid and pokedex_number = v_family
    for update;
  if coalesce(v_candy, 0) < v_cost then
    raise exception 'insufficient_candy' using errcode = 'P0001';
  end if;

  update public.candies
    set count = count - v_cost
    where user_id = v_uid and pokedex_number = v_family;

  update public.pokemon
    set pokedex_number = v_to
    where id = p_pokemon_id;

  v_is_new_species := not exists (
    select 1 from public.pokedex
    where user_id = v_uid and pokedex_number = v_to
  );
  if v_is_new_species then
    insert into public.pokedex (user_id, pokedex_number)
    values (v_uid, v_to)
    on conflict do nothing;
  end if;

  -- Only counts toward 'evolutions' events (unique_species is catch-only).
  perform public._record_event_progress(v_uid, 'evolve', false, null, v_to);

  return json_build_object('to_pokedex_number', v_to, 'is_new_species', v_is_new_species);
end;
$$;


ALTER FUNCTION "public"."evolve_pokemon"("p_pokemon_id" "uuid", "p_target_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_user_id_by_friend_code"("p_friend_code" "text") RETURNS TABLE("id" "uuid", "is_private" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  if p_friend_code is null then
    return;
  end if;
  return query
    select u.id, u.is_private
    from public.users u
    where u.friend_code = upper(p_friend_code);
end;
$$;


ALTER FUNCTION "public"."find_user_id_by_friend_code"("p_friend_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_level_up_candy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.level > OLD.level THEN
    NEW.unclaimed_candy_levels := NEW.unclaimed_candy_levels + (NEW.level - OLD.level);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_level_up_candy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_tokens_no_reuse"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if old.used_at is not null and new.used_at is distinct from old.used_at then
    raise exception 'token_already_used';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."fn_tokens_no_reuse"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_event_leaderboard"("p_event_id" "uuid", "p_limit" integer DEFAULT 100) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_limit int := least(greatest(coalesce(p_limit, 100), 1), 100);
  v_top json;
  v_me json;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.events where id = p_event_id) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  with my_friends as (
    select case when f.user_id = v_uid then f.friend_id else f.user_id end as uid
    from public.friends f
    where f.status = 'accepted' and (f.user_id = v_uid or f.friend_id = v_uid)
  ),
  ranked as (
    select
      u.id,
      u.trainer_name,
      u.avatar_id,
      u.friend_code,
      u.displayed_badges,
      u.is_private,
      ep.count as value,
      rank() over (order by ep.count desc) as rnk,
      (u.is_private and u.id <> v_uid
        and not exists (select 1 from my_friends mf where mf.uid = u.id)) as masked
    from public.event_progress ep
    join public.users u on u.id = ep.user_id
    where ep.event_id = p_event_id and ep.count > 0
  )
  select json_agg(json_build_object(
    'rank', r.rnk,
    'value', r.value,
    'is_private', r.is_private,
    'is_me', r.id = v_uid,
    'id', case when r.masked then null else r.id end,
    'trainer_name', case when r.masked then null else r.trainer_name end,
    'avatar_id', case when r.masked then null else r.avatar_id end,
    'friend_code', case when r.masked then null else r.friend_code end,
    'displayed_badges', case when r.masked then null else r.displayed_badges end
  ) order by r.rnk, r.id)
  into v_top
  from (select * from ranked order by rnk, id limit v_limit) r;

  select json_build_object(
    'rank', r.rnk,
    'value', r.value,
    'trainer_name', r.trainer_name,
    'avatar_id', r.avatar_id,
    'friend_code', r.friend_code,
    'displayed_badges', r.displayed_badges
  )
  into v_me
  from (
    select
      u.id, u.trainer_name, u.avatar_id, u.friend_code, u.displayed_badges,
      ep.count as value,
      rank() over (order by ep.count desc) as rnk
    from public.event_progress ep
    join public.users u on u.id = ep.user_id
    where ep.event_id = p_event_id and ep.count > 0
  ) r
  where r.id = v_uid;

  return json_build_object('top', coalesce(v_top, '[]'::json), 'me', v_me);
end;
$$;


ALTER FUNCTION "public"."get_event_leaderboard"("p_event_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_friend_profile"("p_friend_code" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_target public.users%rowtype;
  v_friendship_id uuid;
  v_buddy json;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  if p_friend_code is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  select * into v_target from public.users where friend_code = upper(p_friend_code);
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if v_target.id <> v_uid then
    select id into v_friendship_id
    from public.friends
    where status = 'accepted'
      and ((user_id = v_uid and friend_id = v_target.id)
        or (user_id = v_target.id and friend_id = v_uid))
    limit 1;
    if v_friendship_id is null then
      raise exception 'not_authorized' using errcode = 'P0001';
    end if;
  end if;

  if v_target.favorite_pokemon_id is not null then
    select json_build_object(
      'id', p.id, 'pokedex_number', p.pokedex_number,
      'is_shiny', p.is_shiny, 'nickname', p.nickname
    )
    into v_buddy
    from public.pokemon p
    where p.id = v_target.favorite_pokemon_id;
  end if;

  return json_build_object(
    'id', v_target.id,
    'friendship_id', coalesce(v_friendship_id::text, ''),
    'trainer_name', v_target.trainer_name,
    'avatar_id', v_target.avatar_id,
    'level', v_target.level,
    'xp', v_target.xp,
    'friend_code', v_target.friend_code,
    'favorite_pokemon_id', v_target.favorite_pokemon_id,
    'displayed_badges', coalesce(v_target.displayed_badges, '{}'::text[]),
    'buddy', v_buddy
  );
end;
$$;


ALTER FUNCTION "public"."get_friend_profile"("p_friend_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_leaderboard"("p_category" "text", "p_limit" integer DEFAULT 100, "p_friends_only" boolean DEFAULT false) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_result json;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  if p_category not in ('catches', 'sites') then
    raise exception 'invalid_category' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    p_limit := 100;
  end if;

  with my_friends as (
    select case when f.user_id = v_uid then f.friend_id else f.user_id end as friend_uid
    from public.friends f
    where f.status = 'accepted' and (f.user_id = v_uid or f.friend_id = v_uid)
  ),
  ranked as (
    select
      u.id,
      u.trainer_name,
      u.avatar_id,
      u.friend_code,
      u.is_private,
      u.displayed_badges,
      (
        u.is_private
        and u.id <> v_uid
        and not exists (select 1 from my_friends mf where mf.friend_uid = u.id)
      ) as masked,
      case when p_category = 'catches'
           then coalesce(s.total_catches, 0)
           else coalesce(cardinality(s.caught_websites), 0) end as value,
      rank() over (
        order by case when p_category = 'catches'
                      then coalesce(s.total_catches, 0)
                      else coalesce(cardinality(s.caught_websites), 0) end desc
      ) as rank
    from public.users u
    left join public.user_stats s on s.user_id = u.id
    where not p_friends_only
       or u.id = v_uid
       or u.id in (select friend_uid from my_friends)
  )
  select json_build_object(
    'top', coalesce((
      select json_agg(row_to_json(t) order by t.rank)
      from (
        select
          r.rank,
          r.value,
          r.is_private,
          (r.id = v_uid) as is_me,
          case when r.masked then null else r.id end               as id,
          case when r.masked then null else r.trainer_name end     as trainer_name,
          case when r.masked then null else r.avatar_id end        as avatar_id,
          case when r.masked then null else r.friend_code end      as friend_code,
          case when r.masked then null else r.displayed_badges end as displayed_badges
        from ranked r
        where r.rank <= p_limit
      ) t
    ), '[]'::json),
    'me', (
      select json_build_object(
        'rank', r.rank,
        'value', r.value,
        'trainer_name', r.trainer_name,
        'avatar_id', r.avatar_id,
        'friend_code', r.friend_code,
        'displayed_badges', r.displayed_badges
      )
      from ranked r
      where r.id = v_uid
    )
  )
  into v_result;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."get_leaderboard"("p_category" "text", "p_limit" integer, "p_friends_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  generated_code text;
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
begin
  loop
    generated_code :=
      substr(chars, floor(random()*36)::int + 1, 1) ||
      substr(chars, floor(random()*36)::int + 1, 1) ||
      substr(chars, floor(random()*36)::int + 1, 1) ||
      substr(chars, floor(random()*36)::int + 1, 1) ||
      '-' ||
      substr(chars, floor(random()*36)::int + 1, 1) ||
      substr(chars, floor(random()*36)::int + 1, 1) ||
      substr(chars, floor(random()*36)::int + 1, 1) ||
      substr(chars, floor(random()*36)::int + 1, 1);
    exit when not exists (
      select 1 from public.users where friend_code = generated_code
    );
  end loop;

  insert into public.users (id, trainer_name, friend_code)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data->>'trainer_name', ''),
      split_part(new.email, '@', 1),
      'Trainer'
    ), 24),
    generated_code
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."perform_catch"("p_nonce" "uuid", "p_caught_on" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
declare
  v_uid uuid := auth.uid();
  v_pending public.pending_encounters%rowtype;
  v_species public.pokemon_species%rowtype;
  v_caught_on text;
  v_result json;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  if p_nonce is null then
    raise exception 'no_pending_encounter' using errcode = 'P0001';
  end if;

  -- caught_on is inherently self-reported (the server can't see the browser);
  -- normalize to a hostname shape and drop anything else rather than reject.
  v_caught_on := lower(p_caught_on);
  if v_caught_on is not null
     and (length(v_caught_on) > 253 or v_caught_on !~ '^[a-z0-9._-]+$')
  then
    v_caught_on := null;
  end if;

  select * into v_pending
    from public.pending_encounters
    where user_id = v_uid
    for update;
  if not found or v_pending.nonce is distinct from p_nonce then
    raise exception 'no_pending_encounter' using errcode = 'P0001';
  end if;
  if v_pending.created_at <= now() - interval '5 minutes' then
    raise exception 'encounter_expired' using errcode = 'P0001';
  end if;

  select * into v_species
    from public.pokemon_species
    where id = v_pending.pokedex_number;

  delete from public.pending_encounters where user_id = v_uid;

  v_result := public._catch_pokemon(
    v_uid,
    v_pending.pokedex_number,
    v_pending.is_shiny,
    v_species.family_base_id,
    public._pokemon_display_name(v_species.name),
    v_caught_on,
    true
  );

  perform public._update_catch_stats(
    v_uid, v_pending.is_shiny, v_species.is_legendary, v_species.types, v_caught_on
  );

  perform public._record_event_progress(
    v_uid, 'catch', v_pending.is_shiny, v_species.types, v_pending.pokedex_number
  );

  return json_build_object(
    'pokedex_number', v_pending.pokedex_number,
    'is_shiny', v_pending.is_shiny,
    'is_new_species', (v_result->>'is_new_species')::boolean
  );
end;
$_$;


ALTER FUNCTION "public"."perform_catch"("p_nonce" "uuid", "p_caught_on" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_token"("p_token_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_token public.tokens%rowtype;
  v_species public.pokemon_species%rowtype;
  v_pokedex int;
  v_is_shiny boolean;
  v_result json;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  select * into v_token
    from public.tokens
    where id = p_token_id and user_id = v_uid
    for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_token.used_at is not null then
    raise exception 'already_used' using errcode = 'P0001';
  end if;
  if v_token.token_type = 'type_pick' and v_token.type_filter is null then
    raise exception 'type_not_selected' using errcode = 'P0001';
  end if;

  -- Server-authoritative roll; the 1/512 baseline (scaled by an active
  -- event's shiny_rate_multiplier) applies to every token type — the shiny
  -- token just forces it.
  v_is_shiny := random() < least(
    1.0 / 512 * public._event_bonus_multiplier('shiny_rate_multiplier'), 1.0
  );
  case v_token.token_type
    when 'legendary' then
      select id into v_pokedex from public.pokemon_species
        where is_legendary and not is_mythical order by random() limit 1;
    when 'mythical' then
      select id into v_pokedex from public.pokemon_species
        where is_mythical order by random() limit 1;
    when 'shiny' then
      select id into v_pokedex from public.pokemon_species
        where not is_mythical order by random() limit 1;
      v_is_shiny := true;
    when 'type_pick' then
      select id into v_pokedex from public.pokemon_species
        where not is_mythical and v_token.type_filter = any(types)
        order by random() limit 1;
    when 'species' then
      -- Exact species (event community rewards) — may be a mythical.
      v_pokedex := v_token.pokedex_number;
    else
      raise exception 'invalid_token_type' using errcode = '22023';
  end case;
  if v_pokedex is null then
    raise exception 'empty_pool' using errcode = 'P0001';
  end if;

  select * into v_species from public.pokemon_species where id = v_pokedex;

  update public.tokens set used_at = now() where id = p_token_id;

  v_result := public._catch_pokemon(
    v_uid,
    v_pokedex,
    v_is_shiny,
    v_species.family_base_id,
    public._pokemon_display_name(v_species.name),
    'pokebrowser.net',
    false
  );

  perform public._update_catch_stats(
    v_uid, v_is_shiny, v_species.is_legendary, v_species.types, 'pokebrowser.net'
  );

  perform public._record_event_progress(
    v_uid, 'catch', v_is_shiny, v_species.types, v_pokedex
  );

  return jsonb_build_object(
    'pokedex_number', v_pokedex,
    'is_shiny', v_is_shiny,
    'is_new_species', (v_result->>'is_new_species')::boolean
  );
end;
$$;


ALTER FUNCTION "public"."redeem_token"("p_token_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."roll_encounter"("p_client_version" integer DEFAULT 1) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  -- The encounter rate lives here, not in the extension. A cloned client can
  -- only change how often it *asks*, and c_roll_cooldown bounds that: a miss
  -- is as sticky as a hit, so calling again inside the cooldown re-returns
  -- "no encounter" rather than rerolling. Browsing slower than the cooldown
  -- is unaffected; a scripted loop is capped at the same rate as a human.
  c_encounter_rate constant double precision := 0.15;
  c_roll_cooldown  constant interval := interval '15 seconds';
  c_cooldown_ms    constant int := 15000;
  v_legacy boolean := p_client_version < 2;
  v_uid uuid := auth.uid();
  v_pending public.pending_encounters%rowtype;
  v_last_roll timestamptz;
  v_pokedex int;
  v_is_shiny boolean;
  v_nonce uuid;
  v_wait int;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  select * into v_pending
    from public.pending_encounters
    where user_id = v_uid
    for update;

  -- Sticky hit: an unexpired encounter is handed back rather than rerolled,
  -- so a client can't reroll-shop for a shiny. Nothing consumes the pending
  -- row when the user dismisses the popup, so this also re-offers an ignored
  -- encounter — hold the normal cooldown so it resurfaces at a sane pace
  -- instead of on every single page load until the 5 minutes are up.
  if found and v_pending.created_at > now() - interval '5 minutes' then
    if v_legacy then
      return jsonb_build_object(
        'nonce', v_pending.nonce,
        'pokedex_number', v_pending.pokedex_number,
        'is_shiny', v_pending.is_shiny
      );
    end if;
    return jsonb_build_object(
      'retry_after_ms', c_cooldown_ms,
      'encounter', jsonb_build_object(
        'nonce', v_pending.nonce,
        'pokedex_number', v_pending.pokedex_number,
        'is_shiny', v_pending.is_shiny
      )
    );
  end if;

  -- Also serializes concurrent rolls from several tabs: the lock above is a
  -- no-op when no pending row exists, so without this each tab could mint
  -- its own nonce and orphan all but one.
  select last_roll_at into v_last_roll
    from public.users
    where id = v_uid
    for update;

  -- Declined: still inside the cooldown. v2 is told exactly how long is left
  -- so it can wait that out instead of guessing against its own clock — an
  -- independently-run client timer would beat against this window and
  -- silently depress the effective rate.
  if v_last_roll is not null and v_last_roll > now() - c_roll_cooldown then
    if v_legacy then
      return null;
    end if;
    v_wait := ceil(extract(epoch from (v_last_roll + c_roll_cooldown - now())) * 1000)::int;
    return jsonb_build_object('encounter', null, 'retry_after_ms', v_wait);
  end if;

  update public.users set last_roll_at = now() where id = v_uid;

  -- The rate roll, for clients that don't gate themselves. A miss restarts
  -- the cooldown just like a hit does, which is what stops a retry loop from
  -- grinding for an encounter.
  if not v_legacy and random() >= c_encounter_rate then
    return jsonb_build_object('encounter', null, 'retry_after_ms', c_cooldown_ms);
  end if;

  -- Spotlight / boosted-type weighting from the live event. Mew and Celebi
  -- never spawn in the wild — tokens are their only source.
  v_pokedex := public._roll_wild_species();
  -- 1/512 baseline, scaled by an active event's shiny_rate_multiplier (x1
  -- when no event), capped at certainty.
  v_is_shiny := random() < least(
    1.0 / 512 * public._event_bonus_multiplier('shiny_rate_multiplier'), 1.0
  );
  v_nonce := gen_random_uuid();

  insert into public.pending_encounters (user_id, nonce, pokedex_number, is_shiny, created_at)
  values (v_uid, v_nonce, v_pokedex, v_is_shiny, now())
  on conflict (user_id) do update
    set nonce = excluded.nonce,
        pokedex_number = excluded.pokedex_number,
        is_shiny = excluded.is_shiny,
        created_at = excluded.created_at;

  if v_legacy then
    return jsonb_build_object(
      'nonce', v_nonce,
      'pokedex_number', v_pokedex,
      'is_shiny', v_is_shiny
    );
  end if;

  -- Fresh encounter: 0 so the popup the client is about to show isn't gated
  -- behind a wait. The pending row itself is what prevents a reroll.
  return jsonb_build_object(
    'retry_after_ms', 0,
    'encounter', jsonb_build_object(
      'nonce', v_nonce,
      'pokedex_number', v_pokedex,
      'is_shiny', v_is_shiny
    )
  );
end;
$$;


ALTER FUNCTION "public"."roll_encounter"("p_client_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_displayed_badges"("p_badge_ids" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_badge_ids is null then
    raise exception 'invalid_badges';
  end if;

  if coalesce(array_length(p_badge_ids, 1), 0) > 3 then
    raise exception 'too_many_badges';
  end if;

  if (select count(*) from unnest(p_badge_ids) b)
     <> (select count(distinct b) from unnest(p_badge_ids) b) then
    raise exception 'duplicate_badges';
  end if;

  -- Unlock is enough — claiming the achievement reward is not required.
  if exists (
    select 1 from unnest(p_badge_ids) b
    where not exists (
      select 1 from public.achievement_unlocks au
      where au.user_id = v_user_id and au.achievement_id = b
    )
  ) then
    raise exception 'badge_not_unlocked';
  end if;

  update public.users set displayed_badges = p_badge_ids where id = v_user_id;
end;
$$;


ALTER FUNCTION "public"."set_displayed_badges"("p_badge_ids" "text"[]) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."achievement_unlocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_id" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "claimed_at" timestamp with time zone
);


ALTER TABLE "public"."achievement_unlocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pokedex_number" integer NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "candies_count_nonneg" CHECK (("count" >= 0)),
    CONSTRAINT "candies_pokedex_number_check" CHECK ((("pokedex_number" >= 1) AND ("pokedex_number" <= 386)))
);


ALTER TABLE "public"."candies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candies_pre_gen2_backup" (
    "id" "uuid",
    "user_id" "uuid",
    "pokedex_number" integer,
    "count" integer,
    "backed_up_at" timestamp with time zone
);


ALTER TABLE "public"."candies_pre_gen2_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_progress" (
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "species" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_progress_count_check" CHECK (("count" >= 0))
);


ALTER TABLE "public"."event_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friend_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "friends_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text"])))
);

ALTER TABLE ONLY "public"."friends" REPLICA IDENTITY FULL;


ALTER TABLE "public"."friends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_encounters" (
    "user_id" "uuid" NOT NULL,
    "nonce" "uuid" NOT NULL,
    "pokedex_number" integer NOT NULL,
    "is_shiny" boolean NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pending_encounters_pokedex_number_check" CHECK ((("pokedex_number" >= 1) AND ("pokedex_number" <= 386)))
);


ALTER TABLE "public"."pending_encounters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokedex" (
    "user_id" "uuid" NOT NULL,
    "pokedex_number" integer NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pokedex_pokedex_number_check" CHECK ((("pokedex_number" >= 1) AND ("pokedex_number" <= 386)))
);


ALTER TABLE "public"."pokedex" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokemon" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pokedex_number" integer NOT NULL,
    "nickname" "text",
    "is_shiny" boolean DEFAULT false NOT NULL,
    "caught_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "caught_on" "text",
    CONSTRAINT "pokemon_nickname_len" CHECK ((("nickname" IS NULL) OR (("char_length"("nickname") >= 1) AND ("char_length"("nickname") <= 12)))),
    CONSTRAINT "pokemon_pokedex_number_check" CHECK ((("pokedex_number" >= 1) AND ("pokedex_number" <= 386)))
);

ALTER TABLE ONLY "public"."pokemon" REPLICA IDENTITY FULL;


ALTER TABLE "public"."pokemon" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokemon_evolutions" (
    "from_id" integer NOT NULL,
    "to_id" integer NOT NULL,
    "candy_cost" integer NOT NULL,
    CONSTRAINT "pokemon_evolutions_candy_cost_check" CHECK (("candy_cost" > 0))
);


ALTER TABLE "public"."pokemon_evolutions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokemon_species" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "types" "text"[] NOT NULL,
    "is_legendary" boolean DEFAULT false NOT NULL,
    "family_base_id" integer NOT NULL,
    "is_mythical" boolean DEFAULT false NOT NULL,
    "generation" integer GENERATED ALWAYS AS (
CASE
    WHEN ("id" <= 151) THEN 1
    WHEN ("id" <= 251) THEN 2
    WHEN ("id" <= 386) THEN 3
    WHEN ("id" <= 493) THEN 4
    WHEN ("id" <= 649) THEN 5
    WHEN ("id" <= 721) THEN 6
    WHEN ("id" <= 809) THEN 7
    WHEN ("id" <= 905) THEN 8
    ELSE 9
END) STORED,
    CONSTRAINT "pokemon_species_family_base_id_check" CHECK ((("family_base_id" >= 1) AND ("family_base_id" <= 386))),
    CONSTRAINT "pokemon_species_id_check" CHECK ((("id" >= 1) AND ("id" <= 386)))
);


ALTER TABLE "public"."pokemon_species" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "text" NOT NULL,
    "type_filter" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "used_at" timestamp with time zone,
    "pokedex_number" integer,
    "event_id" "uuid",
    CONSTRAINT "tokens_species_consistent" CHECK ((("token_type" = 'species'::"text") = ("pokedex_number" IS NOT NULL))),
    CONSTRAINT "tokens_token_type_check" CHECK (("token_type" = ANY (ARRAY['legendary'::"text", 'mythical'::"text", 'type_pick'::"text", 'shiny'::"text", 'species'::"text"]))),
    CONSTRAINT "tokens_type_filter_valid" CHECK ((("type_filter" IS NULL) OR ("type_filter" = ANY (ARRAY['normal'::"text", 'fire'::"text", 'water'::"text", 'electric'::"text", 'grass'::"text", 'ice'::"text", 'fighting'::"text", 'poison'::"text", 'ground'::"text", 'flying'::"text", 'psychic'::"text", 'bug'::"text", 'rock'::"text", 'ghost'::"text", 'dragon'::"text", 'dark'::"text", 'steel'::"text", 'fairy'::"text"]))))
);


ALTER TABLE "public"."tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_stats" (
    "user_id" "uuid" NOT NULL,
    "total_catches" integer DEFAULT 0 NOT NULL,
    "caught_websites" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "types_caught" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "longest_streak" integer DEFAULT 0 NOT NULL,
    "last_catch_date" "date",
    "total_releases" integer DEFAULT 0 NOT NULL,
    "has_nicknamed" boolean DEFAULT false NOT NULL,
    "trainer_name_changed" boolean DEFAULT false NOT NULL,
    "avatar_changed" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "active_dates" "date"[] DEFAULT '{}'::"date"[] NOT NULL
);


ALTER TABLE "public"."user_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "trainer_name" "text" NOT NULL,
    "favorite_pokemon_id" "uuid",
    "level" integer DEFAULT 1 NOT NULL,
    "xp" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_id" "text" DEFAULT 'red'::"text",
    "friend_code" "text",
    "catch_limit" integer DEFAULT 200 NOT NULL,
    "is_private" boolean DEFAULT false NOT NULL,
    "unclaimed_candy_levels" integer DEFAULT 0 NOT NULL,
    "last_catch_at" timestamp with time zone,
    "is_admin" boolean DEFAULT false NOT NULL,
    "displayed_badges" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "theme" "text" DEFAULT 'green'::"text" NOT NULL,
    "catches_today" integer DEFAULT 0 NOT NULL,
    "catches_today_date" "date",
    "has_seen_tutorial" boolean DEFAULT false NOT NULL,
    "last_roll_at" timestamp with time zone,
    "sound_enabled" boolean DEFAULT true NOT NULL,
    "encounter_animations_enabled" boolean DEFAULT true NOT NULL,
    "blocked_sites" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "users_theme_check" CHECK (("theme" = ANY (ARRAY['green'::"text", 'blue'::"text"]))),
    CONSTRAINT "users_trainer_name_len" CHECK ((("char_length"("trainer_name") >= 1) AND ("char_length"("trainer_name") <= 24)))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."achievement_unlocks"
    ADD CONSTRAINT "achievement_unlocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."achievement_unlocks"
    ADD CONSTRAINT "achievement_unlocks_user_id_achievement_id_key" UNIQUE ("user_id", "achievement_id");



ALTER TABLE ONLY "public"."candies"
    ADD CONSTRAINT "candies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candies"
    ADD CONSTRAINT "candies_user_id_pokedex_number_key" UNIQUE ("user_id", "pokedex_number");



ALTER TABLE ONLY "public"."event_progress"
    ADD CONSTRAINT "event_progress_pkey" PRIMARY KEY ("event_id", "user_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_user_id_friend_id_key" UNIQUE ("user_id", "friend_id");



ALTER TABLE ONLY "public"."pending_encounters"
    ADD CONSTRAINT "pending_encounters_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."pokedex"
    ADD CONSTRAINT "pokedex_pkey" PRIMARY KEY ("user_id", "pokedex_number");



ALTER TABLE ONLY "public"."pokemon_evolutions"
    ADD CONSTRAINT "pokemon_evolutions_pkey" PRIMARY KEY ("from_id", "to_id");



ALTER TABLE ONLY "public"."pokemon"
    ADD CONSTRAINT "pokemon_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_species"
    ADD CONSTRAINT "pokemon_species_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_friend_code_key" UNIQUE ("friend_code");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "event_progress_event_id_count_idx" ON "public"."event_progress" USING "btree" ("event_id", "count" DESC);



CREATE INDEX "event_progress_user_id_idx" ON "public"."event_progress" USING "btree" ("user_id");



CREATE INDEX "idx_achievement_unlocks_user" ON "public"."achievement_unlocks" USING "btree" ("user_id");



CREATE INDEX "idx_friends_friend_id" ON "public"."friends" USING "btree" ("friend_id");



CREATE INDEX "idx_pokemon_user_id" ON "public"."pokemon" USING "btree" ("user_id");



CREATE INDEX "idx_tokens_user_unused" ON "public"."tokens" USING "btree" ("user_id") WHERE ("used_at" IS NULL);



CREATE INDEX "idx_user_stats_caught_sites" ON "public"."user_stats" USING "btree" ("cardinality"("caught_websites") DESC);



CREATE INDEX "idx_user_stats_total_catches" ON "public"."user_stats" USING "btree" ("total_catches" DESC);



CREATE INDEX "idx_users_favorite_pokemon_id" ON "public"."users" USING "btree" ("favorite_pokemon_id");



CREATE INDEX "pokemon_evolutions_to_id_idx" ON "public"."pokemon_evolutions" USING "btree" ("to_id");



CREATE UNIQUE INDEX "tokens_one_per_event" ON "public"."tokens" USING "btree" ("user_id", "event_id") WHERE ("event_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "trg_level_up_candy" BEFORE UPDATE OF "level" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."fn_level_up_candy"();



CREATE OR REPLACE TRIGGER "trg_tokens_no_reuse" BEFORE UPDATE ON "public"."tokens" FOR EACH ROW EXECUTE FUNCTION "public"."fn_tokens_no_reuse"();



ALTER TABLE ONLY "public"."achievement_unlocks"
    ADD CONSTRAINT "achievement_unlocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."candies"
    ADD CONSTRAINT "candies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_progress"
    ADD CONSTRAINT "event_progress_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_progress"
    ADD CONSTRAINT "event_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_reward_pokedex_fkey" FOREIGN KEY ("reward_pokedex") REFERENCES "public"."pokemon_species"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_spotlight_pokedex_fkey" FOREIGN KEY ("spotlight_pokedex") REFERENCES "public"."pokemon_species"("id");



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_encounters"
    ADD CONSTRAINT "pending_encounters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pokedex"
    ADD CONSTRAINT "pokedex_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pokemon_evolutions"
    ADD CONSTRAINT "pokemon_evolutions_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "public"."pokemon_species"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pokemon_evolutions"
    ADD CONSTRAINT "pokemon_evolutions_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "public"."pokemon_species"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pokemon"
    ADD CONSTRAINT "pokemon_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_pokedex_number_fkey" FOREIGN KEY ("pokedex_number") REFERENCES "public"."pokemon_species"("id");



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_favorite_pokemon_id_fkey" FOREIGN KEY ("favorite_pokemon_id") REFERENCES "public"."pokemon"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."achievement_unlocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."candies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "candies: select own" ON "public"."candies" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."candies_pre_gen2_backup" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_progress: viewable by owner" ON "public"."event_progress" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events: viewable by authenticated" ON "public"."events" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."friends" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "friends: delete own" ON "public"."friends" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (( SELECT "auth"."uid"() AS "uid") = "friend_id")));



CREATE POLICY "friends: insert own" ON "public"."friends" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = 'pending'::"text") AND ("user_id" <> "friend_id")));



CREATE POLICY "friends: select own" ON "public"."friends" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (( SELECT "auth"."uid"() AS "uid") = "friend_id")));



CREATE POLICY "friends: update own" ON "public"."friends" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "friend_id"));



ALTER TABLE "public"."pending_encounters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokedex" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pokedex: select own" ON "public"."pokedex" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."pokemon" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pokemon: delete own" ON "public"."pokemon" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "pokemon: select own or buddy" ON "public"."pokemon" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE ("users"."favorite_pokemon_id" = "pokemon"."id")))));



CREATE POLICY "pokemon: update own" ON "public"."pokemon" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."pokemon_evolutions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokemon_species" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users: update own row" ON "public"."users" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "users: viewable by self or friends" ON "public"."users" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "id") OR (EXISTS ( SELECT 1
   FROM "public"."friends" "f"
  WHERE ((("f"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("f"."friend_id" = "users"."id")) OR (("f"."friend_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("f"."user_id" = "users"."id")))))));



CREATE POLICY "users_select_own_achievement_unlocks" ON "public"."achievement_unlocks" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "users_select_own_stats" ON "public"."user_stats" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "users_select_own_tokens" ON "public"."tokens" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "users_update_own_tokens" ON "public"."tokens" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."achievement_unlocks";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."candies";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."friends";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."pokedex";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."pokemon";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tokens";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."users";



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































REVOKE ALL ON FUNCTION "public"."_catch_pokemon"("p_user_id" "uuid", "p_pokedex_number" integer, "p_is_shiny" boolean, "p_family_base_id" integer, "p_nickname" "text", "p_caught_on" "text", "p_enforce_cooldown" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_catch_pokemon"("p_user_id" "uuid", "p_pokedex_number" integer, "p_is_shiny" boolean, "p_family_base_id" integer, "p_nickname" "text", "p_caught_on" "text", "p_enforce_cooldown" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."_event_bonus_multiplier"("p_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_event_bonus_multiplier"("p_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_event_bonuses_valid"("p_bonuses" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_event_bonuses_valid"("p_bonuses" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_finalize_ended_events"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_finalize_ended_events"() TO "service_role";



GRANT SELECT,MAINTAIN ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



REVOKE ALL ON FUNCTION "public"."_grant_event_reward"("p_event" "public"."events", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_grant_event_reward"("p_event" "public"."events", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_maybe_complete_community_goal"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_maybe_complete_community_goal"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_pokemon_display_name"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_pokemon_display_name"("p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_record_event_progress"("p_user_id" "uuid", "p_kind" "text", "p_is_shiny" boolean, "p_types" "text"[], "p_pokedex_number" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_record_event_progress"("p_user_id" "uuid", "p_kind" "text", "p_is_shiny" boolean, "p_types" "text"[], "p_pokedex_number" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."_roll_wild_species"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_roll_wild_species"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."_try_unlock_achievement"("p_user_id" "uuid", "p_achievement_id" "text", "p_condition" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_try_unlock_achievement"("p_user_id" "uuid", "p_achievement_id" "text", "p_condition" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."_update_catch_stats"("p_user_id" "uuid", "p_is_shiny" boolean, "p_is_legendary" boolean, "p_types" "text"[], "p_caught_on" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_update_catch_stats"("p_user_id" "uuid", "p_is_shiny" boolean, "p_is_legendary" boolean, "p_types" "text"[], "p_caught_on" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_validate_event_modifiers"("p_spotlight_pokedex" integer, "p_spotlight_rate" numeric, "p_boosted_types" "text"[], "p_type_boost" numeric, "p_boosted_generations" integer[], "p_generation_boost" numeric, "p_community_goal" integer, "p_reward_token_type" "text", "p_reward_pokedex" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_validate_event_modifiers"("p_spotlight_pokedex" integer, "p_spotlight_rate" numeric, "p_boosted_types" "text"[], "p_type_boost" numeric, "p_boosted_generations" integer[], "p_generation_boost" numeric, "p_community_goal" integer, "p_reward_token_type" "text", "p_reward_pokedex" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_action_achievements"("p_trigger" "text", "p_other_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_action_achievements"("p_trigger" "text", "p_other_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_action_achievements"("p_trigger" "text", "p_other_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_achievement"("p_achievement_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_achievement"("p_achievement_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_achievement"("p_achievement_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_candy_reward"("p_pokedex_number" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_candy_reward"("p_pokedex_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_candy_reward"("p_pokedex_number" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dev_add_xp"("p_amount" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dev_add_xp"("p_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dev_add_xp"("p_amount" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dev_create_event"("p_name" "text", "p_description" "text", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_tracked_stat" "text", "p_type_filter" "text", "p_bonuses" "jsonb", "p_spotlight_pokedex" integer, "p_spotlight_rate" numeric, "p_boosted_types" "text"[], "p_type_boost" numeric, "p_community_goal" integer, "p_reward_token_type" "text", "p_reward_pokedex" integer, "p_boosted_generations" integer[], "p_generation_boost" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dev_create_event"("p_name" "text", "p_description" "text", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_tracked_stat" "text", "p_type_filter" "text", "p_bonuses" "jsonb", "p_spotlight_pokedex" integer, "p_spotlight_rate" numeric, "p_boosted_types" "text"[], "p_type_boost" numeric, "p_community_goal" integer, "p_reward_token_type" "text", "p_reward_pokedex" integer, "p_boosted_generations" integer[], "p_generation_boost" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dev_create_event"("p_name" "text", "p_description" "text", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_tracked_stat" "text", "p_type_filter" "text", "p_bonuses" "jsonb", "p_spotlight_pokedex" integer, "p_spotlight_rate" numeric, "p_boosted_types" "text"[], "p_type_boost" numeric, "p_community_goal" integer, "p_reward_token_type" "text", "p_reward_pokedex" integer, "p_boosted_generations" integer[], "p_generation_boost" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dev_delete_event"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dev_delete_event"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dev_delete_event"("p_event_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."dev_grant_token"("p_token_type" "text", "p_type_filter" "text", "p_pokedex_number" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dev_grant_token"("p_token_type" "text", "p_type_filter" "text", "p_pokedex_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dev_grant_token"("p_token_type" "text", "p_type_filter" "text", "p_pokedex_number" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dev_unlock_achievement"("p_achievement_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dev_unlock_achievement"("p_achievement_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dev_unlock_achievement"("p_achievement_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."dev_update_event"("p_event_id" "uuid", "p_name" "text", "p_description" "text", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_tracked_stat" "text", "p_type_filter" "text", "p_bonuses" "jsonb", "p_spotlight_pokedex" integer, "p_spotlight_rate" numeric, "p_boosted_types" "text"[], "p_type_boost" numeric, "p_community_goal" integer, "p_reward_token_type" "text", "p_reward_pokedex" integer, "p_boosted_generations" integer[], "p_generation_boost" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dev_update_event"("p_event_id" "uuid", "p_name" "text", "p_description" "text", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_tracked_stat" "text", "p_type_filter" "text", "p_bonuses" "jsonb", "p_spotlight_pokedex" integer, "p_spotlight_rate" numeric, "p_boosted_types" "text"[], "p_type_boost" numeric, "p_community_goal" integer, "p_reward_token_type" "text", "p_reward_pokedex" integer, "p_boosted_generations" integer[], "p_generation_boost" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dev_update_event"("p_event_id" "uuid", "p_name" "text", "p_description" "text", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_tracked_stat" "text", "p_type_filter" "text", "p_bonuses" "jsonb", "p_spotlight_pokedex" integer, "p_spotlight_rate" numeric, "p_boosted_types" "text"[], "p_type_boost" numeric, "p_community_goal" integer, "p_reward_token_type" "text", "p_reward_pokedex" integer, "p_boosted_generations" integer[], "p_generation_boost" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."evolve_pokemon"("p_pokemon_id" "uuid", "p_target_id" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."evolve_pokemon"("p_pokemon_id" "uuid", "p_target_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."evolve_pokemon"("p_pokemon_id" "uuid", "p_target_id" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."find_user_id_by_friend_code"("p_friend_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."find_user_id_by_friend_code"("p_friend_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_user_id_by_friend_code"("p_friend_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_level_up_candy"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_level_up_candy"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_tokens_no_reuse"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_tokens_no_reuse"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_event_leaderboard"("p_event_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_event_leaderboard"("p_event_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_event_leaderboard"("p_event_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_friend_profile"("p_friend_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_friend_profile"("p_friend_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friend_profile"("p_friend_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_leaderboard"("p_category" "text", "p_limit" integer, "p_friends_only" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_leaderboard"("p_category" "text", "p_limit" integer, "p_friends_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_leaderboard"("p_category" "text", "p_limit" integer, "p_friends_only" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."perform_catch"("p_nonce" "uuid", "p_caught_on" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."perform_catch"("p_nonce" "uuid", "p_caught_on" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."perform_catch"("p_nonce" "uuid", "p_caught_on" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_token"("p_token_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_token"("p_token_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_token"("p_token_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."roll_encounter"("p_client_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."roll_encounter"("p_client_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."roll_encounter"("p_client_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_displayed_badges"("p_badge_ids" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_displayed_badges"("p_badge_ids" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_displayed_badges"("p_badge_ids" "text"[]) TO "service_role";












SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;









GRANT ALL ON TABLE "public"."achievement_unlocks" TO "service_role";
GRANT SELECT ON TABLE "public"."achievement_unlocks" TO "authenticated";



GRANT ALL ON TABLE "public"."candies" TO "service_role";
GRANT SELECT ON TABLE "public"."candies" TO "authenticated";



GRANT ALL ON TABLE "public"."candies_pre_gen2_backup" TO "service_role";



GRANT SELECT,MAINTAIN ON TABLE "public"."event_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."event_progress" TO "service_role";



GRANT ALL ON TABLE "public"."friends" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."friends" TO "authenticated";



GRANT UPDATE("status") ON TABLE "public"."friends" TO "authenticated";



GRANT ALL ON TABLE "public"."pending_encounters" TO "service_role";



GRANT ALL ON TABLE "public"."pokedex" TO "service_role";
GRANT SELECT ON TABLE "public"."pokedex" TO "authenticated";



GRANT ALL ON TABLE "public"."pokemon" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."pokemon" TO "authenticated";



GRANT UPDATE("nickname") ON TABLE "public"."pokemon" TO "authenticated";



GRANT ALL ON TABLE "public"."pokemon_evolutions" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_species" TO "service_role";



GRANT ALL ON TABLE "public"."tokens" TO "service_role";
GRANT SELECT ON TABLE "public"."tokens" TO "authenticated";



GRANT UPDATE("type_filter") ON TABLE "public"."tokens" TO "authenticated";



GRANT ALL ON TABLE "public"."user_stats" TO "service_role";
GRANT SELECT ON TABLE "public"."user_stats" TO "authenticated";



GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT SELECT ON TABLE "public"."users" TO "authenticated";



GRANT UPDATE("trainer_name") ON TABLE "public"."users" TO "authenticated";



GRANT UPDATE("favorite_pokemon_id") ON TABLE "public"."users" TO "authenticated";



GRANT UPDATE("avatar_id") ON TABLE "public"."users" TO "authenticated";



GRANT UPDATE("is_private") ON TABLE "public"."users" TO "authenticated";



GRANT UPDATE("theme") ON TABLE "public"."users" TO "authenticated";



GRANT UPDATE("has_seen_tutorial") ON TABLE "public"."users" TO "authenticated";



GRANT UPDATE("sound_enabled") ON TABLE "public"."users" TO "authenticated";



GRANT UPDATE("encounter_animations_enabled") ON TABLE "public"."users" TO "authenticated";



GRANT UPDATE("blocked_sites") ON TABLE "public"."users" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































