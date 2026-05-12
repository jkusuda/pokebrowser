// Database schema types — re-exported from the shared workspace package so
// the extension and the web app stay in lockstep.
export type {
  User,
  Friend,
  Pokemon,
  Candy,
  PokedexUnlock,
  RecentPokemon,
} from "shared-types";

// Static Pokémon data — re-exported from the shared package
export type { PokemonData as PokemonInfo } from "pokemon-data";
