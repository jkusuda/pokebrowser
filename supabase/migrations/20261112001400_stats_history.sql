-- Arrays rewritten on every catch become rows. Values derivable from other
-- data are dropped:
--   current_streak, last_catch_date  <- user_active_days
--   types_caught                     <- pokedex joined to pokemon_species
--   has_nicknamed, trainer_name_changed, avatar_changed <- their achievement unlocks
-- longest_streak stays: it may predate active_dates, so it can't always be rebuilt.

create table public.user_sites (
  user_id uuid not null references public.users (id) on delete cascade,
  hostname text not null check (char_length(hostname) between 1 and 253),
  primary key (user_id, hostname)
);

create table public.user_active_days (
  user_id uuid not null references public.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

insert into public.user_sites (user_id, hostname)
select distinct user_id, site
from public.user_stats, unnest(caught_websites) as site
where site <> '';

insert into public.user_active_days (user_id, day)
select user_id, day from public.user_stats, unnest(active_dates) as day
union
select user_id, last_catch_date from public.user_stats where last_catch_date is not null;

with numbered as (
  select user_id, day - (row_number() over (partition by user_id order by day))::int as run
  from public.user_active_days
), runs as (
  select user_id, max(n) as longest
  from (select user_id, count(*) as n from numbered group by user_id, run) r
  group by user_id
)
update public.user_stats s
set longest_streak = greatest(s.longest_streak, runs.longest)
from runs
where runs.user_id = s.user_id;

insert into public.achievement_unlocks (user_id, achievement_id)
select user_id, a.id
from public.user_stats
cross join lateral (values
  ('that_sounds_better', has_nicknamed),
  ('identity_crisis', trainer_name_changed),
  ('new_look', avatar_changed)
) as a(id, earned)
where a.earned
on conflict do nothing;

alter table public.user_stats
  drop column caught_websites,
  drop column active_dates,
  drop column types_caught,
  drop column current_streak,
  drop column last_catch_date,
  drop column has_nicknamed,
  drop column trainer_name_changed,
  drop column avatar_changed;

alter table public.user_sites enable row level security;
alter table public.user_active_days enable row level security;
