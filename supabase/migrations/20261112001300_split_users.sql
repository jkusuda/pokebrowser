-- users keeps the trainer profile. Settings and catch pacing move to their own
-- one-row-per-user tables, so pacing writes no longer touch the profile row
-- (which Realtime watches). level is dropped: it's derived from xp.

create table public.user_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  theme text not null default 'green' check (theme in ('green', 'blue')),
  sound_enabled boolean not null default true,
  encounter_animations_enabled boolean not null default true,
  blocked_sites text[] not null default '{}',
  has_seen_tutorial boolean not null default false
);

create table public.user_limits (
  user_id uuid primary key references public.users (id) on delete cascade,
  last_roll_at timestamptz,
  last_catch_at timestamptz,
  catches_today integer not null default 0 check (catches_today >= 0),
  catches_today_date date
);

insert into public.user_settings
  (user_id, theme, sound_enabled, encounter_animations_enabled, blocked_sites, has_seen_tutorial)
select id, theme, sound_enabled, encounter_animations_enabled, blocked_sites, has_seen_tutorial
from public.users;

insert into public.user_limits (user_id, last_roll_at, last_catch_at, catches_today, catches_today_date)
select id, last_roll_at, last_catch_at, catches_today, catches_today_date
from public.users;

insert into public.user_stats (user_id)
select id from public.users
on conflict (user_id) do nothing;

update public.users set avatar_id = 'red' where avatar_id is null;

-- friend_code is nullable today, but every signup gets one.
do $$
declare
  r record;
  code text;
begin
  for r in select id from public.users where friend_code is null loop
    loop
      code := upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' ||
              upper(substr(md5(gen_random_uuid()::text), 1, 4));
      exit when not exists (select 1 from public.users where friend_code = code);
    end loop;
    update public.users set friend_code = code where id = r.id;
  end loop;
end
$$;

alter table public.users
  alter column avatar_id set not null,
  alter column friend_code set not null,
  drop column level,
  drop column theme,
  drop column sound_enabled,
  drop column encounter_animations_enabled,
  drop column blocked_sites,
  drop column has_seen_tutorial,
  drop column last_roll_at,
  drop column last_catch_at,
  drop column catches_today,
  drop column catches_today_date;

create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer
  set search_path = public, pg_temp
as $$
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
    exit when not exists (select 1 from public.users where friend_code = generated_code);
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
  insert into public.user_settings (user_id) values (new.id);
  insert into public.user_limits (user_id) values (new.id);
  insert into public.user_stats (user_id) values (new.id);

  return new;
end;
$$;

alter table public.user_settings enable row level security;
alter table public.user_limits enable row level security;

-- The profile page's Realtime subscription reads settings changes.
create policy "user_settings: select own" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.user_settings to authenticated;
alter publication supabase_realtime add table public.user_settings;
