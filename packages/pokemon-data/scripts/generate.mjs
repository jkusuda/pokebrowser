// One-time script to fetch Pokémon data from PokeAPI and generate the static
// TypeScript data files:
//   ../src/pokemon.ts   POKEMON record + lookup helpers
//   ../src/families.ts  POKEMON_FAMILIES base-form map (shared candy pools)
//   ../src/xp.ts        POKEMON_BASE_XP tiers, derived from evolution stage
//
// Usage: node packages/pokemon-data/scripts/generate.mjs

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "..", "src", "pokemon.ts");
const FAMILIES_OUTPUT = join(__dirname, "..", "src", "families.ts");
const XP_OUTPUT = join(__dirname, "..", "src", "xp.ts");
const POKEAPI = "https://pokeapi.co/api/v2";
const TOTAL = 251;

// PokeAPI resource URLs end in the numeric id, so evolution chains can be
// walked without a fetch per node.
function idFromUrl(url) {
  const match = /\/(\d+)\/?$/.exec(url ?? "");
  return match ? Number(match[1]) : 0;
}

function inRange(id) {
  return id >= 1 && id <= TOTAL;
}

function findChainNode(chain, id) {
  if (idFromUrl(chain.species.url) === id) return chain;
  for (const next of chain.evolves_to ?? []) {
    const found = findChainNode(next, id);
    if (found) return found;
  }
  return null;
}

function getDepth(chain, id, depth = 0) {
  if (idFromUrl(chain.species.url) === id) return depth;
  for (const next of chain.evolves_to ?? []) {
    const result = getDepth(next, id, depth + 1);
    if (result !== null) return result;
  }
  return null;
}

function getChainLength(chain) {
  if (!chain.evolves_to?.length) return 1;
  return 1 + Math.max(...chain.evolves_to.map(getChainLength));
}

/**
 * The base form whose candy pool the whole family shares, resolved by walking
 * *up* the evolution edges of the data we actually ship. Because out-of-range
 * species are never fetched, a chain rooted in a later generation resolves to
 * its earliest shipped member automatically (Happiny #440 → Chansey, Mantyke
 * #458 → Mantine, Azurill #298 → Marill), while baby forms that are in range
 * correctly lead their family (Pichu → Pikachu → Raichu is family 172).
 */
function resolveFamilyBases(allData) {
  const parent = new Map();
  for (const p of allData) {
    for (const target of p.evolvesTo) parent.set(target, p.id);
  }
  for (const p of allData) {
    let current = p.id;
    const seen = new Set([current]);
    while (parent.has(current) && !seen.has(parent.get(current))) {
      current = parent.get(current);
      seen.add(current);
    }
    p.familyBaseId = current;
  }
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
  let evolvesTo = [];
  let evolveCandyCost = null;

  try {
    const evoChainUrl = species.evolution_chain?.url;
    if (evoChainUrl) {
      const evoData = await fetchJSON(evoChainUrl);

      const node = findChainNode(evoData.chain, id);
      if (node) {
        // Every branch, not just the first — Eevee, Tyrogue, Gloom, Poliwhirl
        // and Slowpoke all split. Cross-generation targets we don't ship
        // (Sylveon, Kleavor, Porygon-Z) are dropped.
        evolvesTo = (node.evolves_to ?? [])
          .map((next) => idFromUrl(next.species.url))
          .filter(inRange)
          .sort((a, b) => a - b);

        if (evolvesTo.length > 0) {
          // Cost comes from the *full* PokeAPI chain, including members outside
          // our range. That's deliberate: it's why raising TOTAL adds new rows
          // without shifting any existing species' cost.
          const depth = getDepth(evoData.chain, id) ?? 0;
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
    // Rarity comes straight from PokeAPI rather than a hand-maintained id set.
    // Note it flags Mew and Celebi as mythical but NOT legendary.
    isLegendary: species.is_legendary === true,
    isMythical: species.is_mythical === true,
    familyBaseId: id, // replaced by resolveFamilyBases once the whole set is in
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

function buildPokemonFile(allData) {
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
    evolvesTo: [${p.evolvesTo.join(", ")}],
    evolveCandyCost: ${p.evolveCandyCost ?? "null"},
    isLegendary: ${p.isLegendary},
    isMythical: ${p.isMythical},
    baseStats: { hp: ${p.baseStats.hp}, atk: ${p.baseStats.atk}, def: ${p.baseStats.def}, spAtk: ${p.baseStats.spAtk}, spDef: ${p.baseStats.spDef}, speed: ${p.baseStats.speed} },
  }`;
  });

  return `// AUTO-GENERATED — do not edit manually.
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
  /** Every species this can evolve into. Empty when it's a final form. */
  evolvesTo: number[];
  /** Candy cost, identical across branches. Null when it can't evolve. */
  evolveCandyCost: number | null;
  /** PokeAPI rarity flags. Mythicals (Mew, Celebi) are NOT flagged legendary. */
  isLegendary: boolean;
  isMythical: boolean;
  baseStats: PokemonBaseStats;
}

export const POKEMON: Record<number, PokemonData> = {
${entries.join(",\n")}
};

/**
 * Synchronous Pokémon data lookup.
 * Returns the full data object for a Pokémon, or null if not found.
 */
export function getPokemonData(pokedexNumber: number): PokemonData | null {
  return POKEMON[pokedexNumber] ?? null;
}

/**
 * Get a Pokémon's display name, properly capitalized.
 * Mirrored by the _pokemon_display_name SQL helper — keep the two in sync.
 */
export function getPokemonName(pokedexNumber: number): string {
  const data = POKEMON[pokedexNumber];
  if (!data) return \`Pokemon #\${pokedexNumber}\`;

  // Names the generic rule below would mangle.
  const name = data.name;
  if (name === "nidoran-f") return "Nidoran♀";
  if (name === "nidoran-m") return "Nidoran♂";
  if (name === "mr-mime") return "Mr. Mime";
  if (name === "farfetchd") return "Farfetch'd";
  if (name === "ho-oh") return "Ho-Oh";
  if (name === "porygon2") return "Porygon2";

  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}
`;
}

function buildFamiliesFile(allData) {
  const byId = new Map(allData.map((p) => [p.id, p]));

  // Group members under their base so the file reads one line per family.
  const groups = new Map();
  for (const p of allData) {
    if (!groups.has(p.familyBaseId)) groups.set(p.familyBaseId, []);
    groups.get(p.familyBaseId).push(p.id);
  }

  const lines = [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([base, members]) => {
      const pairs = members.sort((a, b) => a - b).map((m) => `${m}: ${base},`).join(" ");
      const baseName = byId.get(base)?.name ?? `#${base}`;
      const label = members.length > 1 ? `${baseName} line` : baseName;
      return `  ${pairs.padEnd(34)} // ${label}`;
    });

  return `// AUTO-GENERATED — do not edit manually.
// Run \`node packages/pokemon-data/scripts/generate.mjs\` to regenerate.
//
// Maps every Pokémon to its base-form Pokédex number.
// Used for shared candy pools (e.g. Sandslash → Sandshrew candy), and mirrored
// by pokemon_species.family_base_id in the database.

export const POKEMON_FAMILIES: Record<number, number> = {
${lines.join("\n")}
};

export function getFamilyId(pokedexNumber: number): number {
  return POKEMON_FAMILIES[pokedexNumber] ?? pokedexNumber;
}
`;
}

/**
 * XP tier is a pure function of rarity and position in the evolution line, so
 * it's derived rather than hand-maintained. Note the tier reflects a species'
 * position in the range we *ship*: Onix counts as a basic once Steelix exists.
 */
function baseXpFor(p, evolutionTargets) {
  if (p.isLegendary || p.isMythical) return 1000;
  if (p.evolvesTo.length === 0) return 300; // final form or true single-stage
  if (evolutionTargets.has(p.id)) return 200; // middle
  return 100; // basic that evolves
}

function buildXpFile(allData) {
  const targets = new Set(allData.flatMap((p) => p.evolvesTo));
  const byId = new Map(allData.map((p) => [p.id, p]));

  // One line per family, mirroring families.ts so the two read side by side.
  const groups = new Map();
  for (const p of allData) {
    if (!groups.has(p.familyBaseId)) groups.set(p.familyBaseId, []);
    groups.get(p.familyBaseId).push(p);
  }

  const lines = [...groups.entries()]
    .sort((a, b) => Math.min(...a[1].map((p) => p.id)) - Math.min(...b[1].map((p) => p.id)))
    .map(([base, members]) => {
      const sorted = members.sort((a, b) => a.id - b.id);
      const pairs = sorted.map((p) => `${p.id}: ${baseXpFor(p, targets)},`).join(" ");
      const baseName = byId.get(base)?.name ?? `#${base}`;
      const label = sorted.length > 1 ? `${baseName} line` : baseName;
      return `  ${pairs.padEnd(34)} // ${label}`;
    });

  return `// AUTO-GENERATED — do not edit manually.
// Run \`node packages/pokemon-data/scripts/generate.mjs\` to regenerate.
//
// Basic: 100, Middle: 200, Final/single-stage: 300, Legendary/Mythical: 1000
// Shiny bonus: +2000 (stacks with base)
//
// DISPLAY ONLY. The awarded value is computed by the _catch_pokemon RPC, which
// derives the same tiers from the pokemon_species and pokemon_evolutions
// reference tables — so this file cannot drift out of sync with gameplay.

export const POKEMON_BASE_XP: Record<number, number> = {
${lines.join("\n")}
};

export function getPokemonBaseXp(pokedexNumber: number, isShiny: boolean): number {
  const base = POKEMON_BASE_XP[pokedexNumber] ?? 100;
  return isShiny ? base + 2000 : base;
}
`;
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

  allData.sort((a, b) => a.id - b.id);

  // Needs the whole set — a family base can be any member of the chain.
  resolveFamilyBases(allData);

  writeFileSync(OUTPUT, buildPokemonFile(allData), "utf-8");
  writeFileSync(FAMILIES_OUTPUT, buildFamiliesFile(allData), "utf-8");
  writeFileSync(XP_OUTPUT, buildXpFile(allData), "utf-8");
  console.log(`\n✅ Generated ${OUTPUT} with ${allData.length} Pokémon.`);
  console.log(`✅ Generated ${FAMILIES_OUTPUT}.`);
  console.log(`✅ Generated ${XP_OUTPUT}.`);
}

main().catch((err) => {
  console.error("Generation failed:", err);
  process.exit(1);
});
