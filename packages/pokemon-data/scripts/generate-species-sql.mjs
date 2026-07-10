// Generates the INSERT statements for the `pokemon_species` reference table
// (used by the `redeem_token` RPC to roll encounters server-side).
//
// Usage: node packages/pokemon-data/scripts/generate-species-sql.mjs
// Paste the output into a Supabase migration whenever the data changes
// (e.g. when a new generation is added).
//
// Requires Node >= 23 (native TypeScript type stripping for the .ts imports).

import { POKEMON } from "../src/pokemon.ts";
import { POKEMON_FAMILIES } from "../src/families.ts";

const LEGENDARY_IDS = new Set([144, 145, 146, 150, 151]);

const rows = Object.values(POKEMON)
  .sort((a, b) => a.id - b.id)
  .map((p) => {
    const types = `'{${p.types.join(",")}}'`;
    const name = `'${p.name.replace(/'/g, "''")}'`;
    const legendary = LEGENDARY_IDS.has(p.id);
    const family = POKEMON_FAMILIES[p.id];
    if (!family) throw new Error(`No family for #${p.id}`);
    return `  (${p.id}, ${name}, ${types}, ${legendary}, ${family})`;
  });

console.log(
  "insert into public.pokemon_species (id, name, types, is_legendary, family_base_id) values"
);
console.log(rows.join(",\n") + ";");
