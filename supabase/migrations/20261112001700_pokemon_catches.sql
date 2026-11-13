-- encounter_id is the roll's nonce, so a retried catch finds its own row.
alter table public.pokemon add column encounter_id uuid unique;

drop index public.idx_pokemon_user_id;
create index pokemon_user_caught_at_idx on public.pokemon (user_id, caught_at desc);

drop index public.idx_achievement_unlocks_user;
