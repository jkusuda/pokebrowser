// Generates the seed statements for the two server-side reference tables:
//   pokemon_species     (id, name, types, is_legendary, is_mythical, family_base_id)
//   pokemon_evolutions  (from_id, to_id, candy_cost)
//
// Together these are the authority for every server-side roll and catch fact —
// species pools, candy pools, evolution targets/costs, and the XP tier
// derivation inside _catch_pokemon. Nothing about evolution is hardcoded in SQL.
//
// Usage: node packages/pokemon-data/scripts/generate-species-sql.mjs
// Paste the output into a Supabase migration whenever the data changes.
//
// Requires Node >= 23 (native TypeScript type stripping for the .ts imports).

import { POKEMON } from "../src/pokemon.ts";
import { POKEMON_FAMILIES } from "../src/families.ts";

const all = Object.values(POKEMON).sort((a, b) => a.id - b.id);

const speciesRows = all.map((p) => {
  const types = `'{${p.types.join(",")}}'`;
  const name = `'${p.name.replace(/'/g, "''")}'`;
  const family = POKEMON_FAMILIES[p.id];
  if (!family) throw new Error(`No family for #${p.id}`);
  // PokeAPI flags mythicals as mythical-but-not-legendary. We store them as
  // both so the legendary_encounter achievement still fires on Mew/Celebi;
  // the roll pools exclude them via `not is_mythical`.
  const legendary = p.isLegendary || p.isMythical;
  return `  (${p.id}, ${name}, ${types}, ${legendary}, ${p.isMythical}, ${family})`;
});

const evolutionRows = all.flatMap((p) =>
  p.evolvesTo.map((to) => `  (${p.id}, ${to}, ${p.evolveCandyCost})`)
);

// Upserts rather than plain inserts — pokemon_species already holds every
// previously shipped generation, so a bare INSERT would conflict on the primary key.
console.log(`-- ${speciesRows.length} species`);
console.log(
  "insert into public.pokemon_species (id, name, types, is_legendary, is_mythical, family_base_id) values"
);
console.log(speciesRows.join(",\n"));
console.log(`on conflict (id) do update set
  name           = excluded.name,
  types          = excluded.types,
  is_legendary   = excluded.is_legendary,
  is_mythical    = excluded.is_mythical,
  family_base_id = excluded.family_base_id;`);

console.log(`\n-- ${evolutionRows.length} evolution edges`);
console.log("insert into public.pokemon_evolutions (from_id, to_id, candy_cost) values");
console.log(evolutionRows.join(",\n"));
console.log(`on conflict (from_id, to_id) do update set
  candy_cost = excluded.candy_cost;`);
