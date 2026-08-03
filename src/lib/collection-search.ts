import { Pokemon } from "@/types";
import { getPokemonData } from "@/lib/pokemon";
import { POKEMON_TYPES, PokemonType } from "@/lib/types";

type Predicate = (p: Pokemon) => boolean;

// Static keyword registry — add a new keyword by adding one entry here.
//
// Rarity reads the generated PokeAPI flags rather than a hand-typed id set, so
// a new generation needs no edit here. Note these flags are mutually exclusive:
// Mew and Celebi are mythical and NOT legendary, so `legendary:` excludes them
// — which is what the search has always done. (The DB deliberately differs and
// flags mythicals as both, so `legendary_encounter` still fires on them.)
const KEYWORD_PREDICATES: Record<string, Predicate> = {
  shiny: (p) => p.is_shiny,
  legendary: (p) => getPokemonData(p.pokedex_number)?.isLegendary ?? false,
  mythical: (p) => getPokemonData(p.pokedex_number)?.isMythical ?? false,
};

const TYPE_SET = new Set<string>(POKEMON_TYPES);

function buildTermPredicate(term: string): Predicate {
  if (term in KEYWORD_PREDICATES) return KEYWORD_PREDICATES[term];

  if (TYPE_SET.has(term)) {
    const type = term as PokemonType;
    return (p) => getPokemonData(p.pokedex_number)?.types.includes(type) ?? false;
  }

  return (p) => {
    const info = getPokemonData(p.pokedex_number);
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
