-- Species references become foreign keys instead of hard-coded 1..386 ranges.
alter table public.pokemon_species
  drop constraint pokemon_species_id_check,
  drop constraint pokemon_species_family_base_id_check,
  add constraint pokemon_species_id_positive check (id > 0),
  add constraint pokemon_species_family_base_id_fkey
    foreign key (family_base_id) references public.pokemon_species (id);

alter table public.pokemon
  drop constraint pokemon_pokedex_number_check,
  add constraint pokemon_pokedex_number_fkey
    foreign key (pokedex_number) references public.pokemon_species (id);

alter table public.pokedex
  drop constraint pokedex_pokedex_number_check,
  add constraint pokedex_pokedex_number_fkey
    foreign key (pokedex_number) references public.pokemon_species (id);

alter table public.pending_encounters
  drop constraint pending_encounters_pokedex_number_check,
  add constraint pending_encounters_pokedex_number_fkey
    foreign key (pokedex_number) references public.pokemon_species (id);

-- candies are counted per evolution family, keyed by the family's base species.
alter table public.candies rename column pokedex_number to family_base_id;
alter table public.candies
  drop constraint candies_pokedex_number_check,
  drop constraint candies_user_id_pokedex_number_key,
  drop constraint candies_pkey,
  drop column id,
  add primary key (user_id, family_base_id),
  add constraint candies_family_base_id_fkey
    foreign key (family_base_id) references public.pokemon_species (id);

alter table public.achievement_unlocks
  drop constraint achievement_unlocks_user_id_achievement_id_key,
  drop constraint achievement_unlocks_pkey,
  drop column id,
  add primary key (user_id, achievement_id);

-- Every user reference points at public.users, like the other tables.
alter table public.pokemon
  drop constraint pokemon_user_id_fkey,
  add constraint pokemon_user_id_fkey
    foreign key (user_id) references public.users (id) on delete cascade;

alter table public.pokedex
  drop constraint pokedex_user_id_fkey,
  add constraint pokedex_user_id_fkey
    foreign key (user_id) references public.users (id) on delete cascade;

alter table public.candies
  drop constraint candies_user_id_fkey,
  add constraint candies_user_id_fkey
    foreign key (user_id) references public.users (id) on delete cascade;

alter table public.friends
  drop constraint friends_user_id_fkey,
  drop constraint friends_friend_id_fkey,
  add constraint friends_user_id_fkey
    foreign key (user_id) references public.users (id) on delete cascade,
  add constraint friends_friend_id_fkey
    foreign key (friend_id) references public.users (id) on delete cascade;
