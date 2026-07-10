import { Pokemon } from "@/types";
import { getPokemonData } from "@/lib/pokemon";
import { GEN1_TYPES, Gen1Type } from "@/lib/types";

// Articuno, Zapdos, Moltres, Mewtwo. Deliberately excludes Mew (151) — Mew is
// "mythical" for this search feature, even though the unrelated LEGENDARY_IDS
// in src/app/api/tokens/open/route.ts lumps it into "legendary" for token rolls.
const LEGENDARY_IDS = new Set([144, 145, 146, 150]);
const MYTHICAL_IDS = new Set([151]);

type Predicate = (p: Pokemon) => boolean;

// Static keyword registry — add a new keyword by adding one entry here.
const KEYWORD_PREDICATES: Record<string, Predicate> = {
  shiny: (p) => p.is_shiny,
  legendary: (p) => LEGENDARY_IDS.has(p.pokedex_number),
  mythical: (p) => MYTHICAL_IDS.has(p.pokedex_number),
};

const GEN1_TYPE_SET = new Set<string>(GEN1_TYPES);

function buildTermPredicate(term: string): Predicate {
  if (term in KEYWORD_PREDICATES) return KEYWORD_PREDICATES[term];

  if (GEN1_TYPE_SET.has(term)) {
    const type = term as Gen1Type;
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
 * together; each term matches as a known keyword, a Gen 1 type, or (fallback)
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
