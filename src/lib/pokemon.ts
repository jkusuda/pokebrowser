// Re-exports static Pokémon data from the shared package.
// No more PokeAPI calls — all lookups are instant.

export { getPokemonData, getPokemonName, getFamilyId, getLevelProgress } from "pokemon-data";
export type { PokemonData, LevelProgress } from "pokemon-data";

export const TRAINER_BASE = "https://play.pokemonshowdown.com/sprites/trainers";

export function getPokemonSprite(pokedexNumber: number, isShiny = false): string {
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/${isShiny ? "shiny/" : ""}${pokedexNumber}.gif`;
}

export function getPokedexSprite(pokedexNumber: number): string {
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokedexNumber}.png`;
}

/**
 * Sizes the buddy sprite relative to the trainer avatar.
 * The trainer icon is ~230 px tall and represents 1.5 m, giving a scale of
 * ~153 px/m. No upper cap — large Pokémon (Onix, Gyarados) will overflow the
 * card and be clipped, which is intentional.
 */
export function getBuddySpriteSize(heightMetres: number): number {
  const PX_PER_METRE = 230 / 1.5; // ≈ 153
  return Math.max(32, Math.round(heightMetres * PX_PER_METRE));
}