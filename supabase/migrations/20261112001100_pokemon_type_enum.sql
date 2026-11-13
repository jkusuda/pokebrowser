create type public.pokemon_type as enum (
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
);

alter table public.pokemon_species
  alter column types type public.pokemon_type[] using types::public.pokemon_type[];

alter table public.tokens
  drop constraint tokens_type_filter_valid,
  alter column type_filter type public.pokemon_type using type_filter::public.pokemon_type;

alter table public.events
  drop constraint events_type_filter_check,
  drop constraint events_boosted_types_valid,
  alter column type_filter type public.pokemon_type using type_filter::public.pokemon_type,
  alter column boosted_types drop default,
  alter column boosted_types type public.pokemon_type[] using boosted_types::public.pokemon_type[],
  alter column boosted_types set default '{}',
  add constraint events_boosted_types_max check (cardinality(boosted_types) <= 3);
