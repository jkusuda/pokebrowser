// One-time script to fetch all Gen 1 Pokémon data from PokeAPI
// and generate a static TypeScript file.
//
// Usage: node packages/pokemon-data/scripts/generate.mjs

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "..", "src", "pokemon.ts");
const POKEAPI = "https://pokeapi.co/api/v2";
const TOTAL = 151;

// Family mapping for candy costs (inline, only used during generation)
const FAMILIES = [
  [1,2,3],[4,5,6],[7,8,9],[10,11,12],[13,14,15],[16,17,18],
  [19,20],[21,22],[23,24],[25,26],[27,28],[29,30,31],[32,33,34],
  [35,36],[37,38],[39,40],[41,42],[43,44,45],[46,47],[48,49],
  [50,51],[52,53],[54,55],[56,57],[58,59],[60,61,62],[63,64,65],
  [66,67,68],[69,70,71],[72,73],[74,75,76],[77,78],[79,80],[81,82],
  [83],[84,85],[86,87],[88,89],[90,91],[92,93,94],[95],[96,97],
  [98,99],[100,101],[102,103],[104,105],[106],[107],[108],[109,110],
  [111,112],[113],[114],[115],[116,117],[118,119],[120,121],[122],
  [123],[124],[125],[126],[127],[128],[129,130],[131],[132],
  [133,134,135,136],[137],[138,139],[140,141],[142],[143],
  [144],[145],[146],[147,148,149],[150],[151],
];

function getFamilyOf(id) {
  for (const fam of FAMILIES) {
    if (fam.includes(id)) return fam;
  }
  return [id];
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchPokemonData(id) {
  const [pkmn, species] = await Promise.all([
    fetchJSON(`${POKEAPI}/pokemon/${id}`),
    fetchJSON(`${POKEAPI}/pokemon-species/${id}`),
  ]);

  const getStat = (name) => pkmn.stats.find((s) => s.stat.name === name)?.base_stat ?? 0;

  const flavorEntry = species.flavor_text_entries.find((e) => e.language.name === "en");
  const description = flavorEntry
    ? flavorEntry.flavor_text.replace(/[\n\f\t\v\r]/g, " ")
    : "No description available.";

  // Evolution info
  let evolvesTo = null;
  let evolveCandyCost = null;

  try {
    const evoChainUrl = species.evolution_chain?.url;
    if (evoChainUrl) {
      const evoData = await fetchJSON(evoChainUrl);

      const findNext = (chain, targetName) => {
        if (chain.species.name === targetName) {
          return chain.evolves_to?.[0]?.species?.name ?? null;
        }
        for (const next of chain.evolves_to ?? []) {
          const result = findNext(next, targetName);
          if (result !== null) return result;
        }
        return null;
      };

      const getDepth = (chain, targetName, depth = 0) => {
        if (chain.species.name === targetName) return depth;
        for (const next of chain.evolves_to ?? []) {
          const result = getDepth(next, targetName, depth + 1);
          if (result !== null) return result;
        }
        return null;
      };

      const getChainLength = (chain) => {
        if (!chain.evolves_to?.length) return 1;
        return 1 + Math.max(...chain.evolves_to.map(getChainLength));
      };

      const nextSpeciesName = findNext(evoData.chain, pkmn.name);
      if (nextSpeciesName) {
        // Resolve the next species' national dex number
        const nextSpecies = await fetchJSON(`${POKEAPI}/pokemon-species/${nextSpeciesName}`);

        // Only keep evolutions within the supported generation — cross-gen
        // evolutions (Onix→Steelix, Scyther→Scizor, ...) don't exist in-game.
        if (nextSpecies.id <= TOTAL) {
          evolvesTo = nextSpecies.id;

          const depth = getDepth(evoData.chain, pkmn.name) ?? 0;
          const chainLength = getChainLength(evoData.chain);
          if (chainLength === 3) {
            evolveCandyCost = depth === 0 ? 25 : 100;
          } else {
            evolveCandyCost = 50;
          }
        }
      }
    }
  } catch {
    // Non-critical
  }

  return {
    id,
    name: pkmn.name,
    types: pkmn.types.map((t) => t.type.name),
    weight: pkmn.weight / 10,
    height: pkmn.height / 10,
    description,
    evolvesTo,
    evolveCandyCost,
    baseStats: {
      hp: getStat("hp"),
      atk: getStat("attack"),
      def: getStat("defense"),
      spAtk: getStat("special-attack"),
      spDef: getStat("special-defense"),
      speed: getStat("speed"),
    },
  };
}

async function main() {
  console.log(`Fetching data for ${TOTAL} Pokémon from PokeAPI...`);

  // Fetch in batches of 10 to avoid hammering the API
  const allData = [];
  for (let batch = 0; batch < TOTAL; batch += 10) {
    const end = Math.min(batch + 10, TOTAL);
    const ids = Array.from({ length: end - batch }, (_, i) => batch + i + 1);
    console.log(`  Fetching #${ids[0]}–#${ids[ids.length - 1]}...`);

    const results = await Promise.all(ids.map(fetchPokemonData));
    allData.push(...results);

    // Small delay between batches
    if (end < TOTAL) await new Promise((r) => setTimeout(r, 500));
  }

  // Sort by ID
  allData.sort((a, b) => a.id - b.id);

  // Generate TypeScript
  const entries = allData.map((p) => {
    const types = JSON.stringify(p.types);
    const desc = JSON.stringify(p.description);
    return `  ${p.id}: {
    id: ${p.id},
    name: ${JSON.stringify(p.name)},
    types: ${types},
    weight: ${p.weight},
    height: ${p.height},
    description: ${desc},
    evolvesTo: ${p.evolvesTo ?? "null"},
    evolveCandyCost: ${p.evolveCandyCost ?? "null"},
    baseStats: { hp: ${p.baseStats.hp}, atk: ${p.baseStats.atk}, def: ${p.baseStats.def}, spAtk: ${p.baseStats.spAtk}, spDef: ${p.baseStats.spDef}, speed: ${p.baseStats.speed} },
  }`;
  });

  const ts = `// AUTO-GENERATED — do not edit manually.
// Run \`node packages/pokemon-data/scripts/generate.mjs\` to regenerate.

export interface PokemonBaseStats {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export interface PokemonData {
  id: number;
  name: string;
  types: string[];
  weight: number;   // kg
  height: number;   // m
  description: string;
  evolvesTo: number | null;
  evolveCandyCost: number | null;
  baseStats: PokemonBaseStats;
}

export const POKEMON: Record<number, PokemonData> = {
${entries.join(",\n")}
};

/**
 * Synchronous Pokémon data lookup.
 * Returns the full data object for a Gen 1 Pokémon, or null if not found.
 */
export function getPokemonData(pokedexNumber: number): PokemonData | null {
  return POKEMON[pokedexNumber] ?? null;
}

/**
 * Get a Pokémon's display name, properly capitalized.
 */
export function getPokemonName(pokedexNumber: number): string {
  const data = POKEMON[pokedexNumber];
  if (!data) return \`Pokemon #\${pokedexNumber}\`;
  
  // Handle Gen 1 special cases
  const name = data.name;
  if (name === "nidoran-f") return "Nidoran♀";
  if (name === "nidoran-m") return "Nidoran♂";
  if (name === "mr-mime") return "Mr. Mime";
  if (name === "farfetchd") return "Farfetch'd";
  
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}
`;

  writeFileSync(OUTPUT, ts, "utf-8");
  console.log(`\n✅ Generated ${OUTPUT} with ${allData.length} Pokémon.`);
}

main().catch((err) => {
  console.error("Generation failed:", err);
  process.exit(1);
});
