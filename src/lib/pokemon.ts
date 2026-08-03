// Re-exports static Pokémon data from the shared package.
// No more PokeAPI calls — all lookups are instant.

import { getPokemonData as lookupPokemonData } from "pokemon-data";
import {
  BUDDY_OVERRIDES,
  BUDDY_EDGE_PX,
  BUDDY_GROUND_PX,
  type BuddyOverride,
} from "./buddy-overrides";

export { getPokemonData, getPokemonName, getFamilyId, getLevelProgress } from "pokemon-data";
export type { PokemonData, LevelProgress } from "pokemon-data";

export const TRAINER_BASE = "https://play.pokemonshowdown.com/sprites/trainers";

export function getPokemonSprite(pokedexNumber: number, isShiny = false): string {
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/${isShiny ? "shiny/" : ""}${pokedexNumber}.gif`;
}

export function getPokedexSprite(pokedexNumber: number): string {
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokedexNumber}.png`;
}

export type BuddySpriteLayout = {
  height: number; // px for the <img> (width stays auto)
  bottom: number; // px from the sprite area's bottom edge
  left: number;   // px from the sprite area's left edge
};

// The trainer icon is ~230 px tall and represents 1.5 m, giving ~153 px/m.
const PX_PER_METRE = 230 / 1.5;
const MIN_SIZE = 32;

/**
 * Sizes the buddy sprite relative to the trainer avatar, from the Pokémon's
 * real-world height. No upper cap — large Pokémon (Onix, Gyarados) overflow the
 * card and are clipped, which is intentional: the size difference is the point.
 */
export function getBuddySpriteSize(heightMetres: number): number {
  return Math.max(MIN_SIZE, Math.round(heightMetres * PX_PER_METRE));
}

/**
 * Places a buddy sprite on a trainer card: real-world height sets the size,
 * then any per-Pokémon correction from `BUDDY_OVERRIDES` is applied on top (see
 * that file for why individual sprites need nudging).
 *
 * `override` replaces the table lookup so the /dev/buddy tuner can preview a
 * candidate value; production callers omit it.
 */
export function getBuddySpriteLayout(
  pokedexNumber: number,
  override?: BuddyOverride,
): BuddySpriteLayout {
  const data = lookupPokemonData(pokedexNumber);
  const base = data ? getBuddySpriteSize(data.height) : 96;
  const { scale = 1, dx = 0, dy = 0 } = override ?? BUDDY_OVERRIDES[pokedexNumber] ?? {};

  return {
    height: Math.round(base * scale),
    bottom: BUDDY_GROUND_PX + dy,
    left: BUDDY_EDGE_PX + dx,
  };
}