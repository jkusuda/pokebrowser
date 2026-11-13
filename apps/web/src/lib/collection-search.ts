import type { Pokemon, PokemonType } from "api-client";
import { getPokemonData } from "pokemon-data";
import { POKEMON_TYPES } from "@/lib/type-styles";

type Predicate = (p: Pokemon) => boolean;

// The legendary and mythical flags are mutually exclusive, so `legendary` excludes Mew and Celebi.
const KEYWORD_PREDICATES: Record<string, Predicate> = {
  shiny: (p) => p.isShiny,
  legendary: (p) => getPokemonData(p.pokedexNumber)?.isLegendary ?? false,
  mythical: (p) => getPokemonData(p.pokedexNumber)?.isMythical ?? false,
};

const TYPE_SET = new Set<string>(POKEMON_TYPES);

function buildTermPredicate(term: string): Predicate {
  if (term in KEYWORD_PREDICATES) return KEYWORD_PREDICATES[term];

  if (TYPE_SET.has(term)) {
    const type = term as PokemonType;
    return (p) => getPokemonData(p.pokedexNumber)?.types.includes(type) ?? false;
  }

  return (p) => {
    const info = getPokemonData(p.pokedexNumber);
    return (
      (p.nickname?.toLowerCase().includes(term) ?? false) ||
      (info?.name.toLowerCase().includes(term) ?? false)
    );
  };
}

/**
 * Filters a collection by a free-text query. `&`-separated terms are ANDed
 * together; each term matches as a known keyword, a Pokémon type, or (fallback)
 * a nickname/species substring.
 */
export function filterCollection(pokemon: Pokemon[], query: string): Pokemon[] {
  const terms = query
    .toLowerCase()
    .split("&")
    .map((t) => t.trim())
    .filter(Boolean);

  if (terms.length === 0) return pokemon;

  const predicates = terms.map(buildTermPredicate);
  return pokemon.filter((p) => predicates.every((pred) => pred(p)));
}
