import { getPokemonData } from "pokemon-data";
import {
  BUDDY_OVERRIDES,
  BUDDY_EDGE_PX,
  BUDDY_GROUND_PX,
  type BuddyOverride,
} from "./buddy-overrides";

export const TRAINER_BASE = "https://play.pokemonshowdown.com/sprites/trainers";

export function getPokemonSprite(pokedexNumber: number, isShiny = false): string {
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/${isShiny ? "shiny/" : ""}${pokedexNumber}.gif`;
}

export function getPokedexSprite(pokedexNumber: number): string {
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokedexNumber}.png`;
}

type BuddySpriteLayout = {
  height: number;
  bottom: number;
  left: number;
};

// The trainer icon is ~230 px tall and represents 1.5 m.
const PX_PER_METRE = 230 / 1.5;
const MIN_SIZE = 32;

// Uncapped on purpose: large Pokémon overflow the card and are clipped.
function getBuddySpriteSize(heightMetres: number): number {
  return Math.max(MIN_SIZE, Math.round(heightMetres * PX_PER_METRE));
}

/** `override` replaces the BUDDY_OVERRIDES lookup so /dev/buddy can preview a candidate. */
export function getBuddySpriteLayout(
  pokedexNumber: number,
  override?: BuddyOverride,
): BuddySpriteLayout {
  const data = getPokemonData(pokedexNumber);
  const base = data ? getBuddySpriteSize(data.height) : 96;
  const { scale = 1, dx = 0, dy = 0 } = override ?? BUDDY_OVERRIDES[pokedexNumber] ?? {};

  return {
    height: Math.round(base * scale),
    bottom: BUDDY_GROUND_PX + dy,
    left: BUDDY_EDGE_PX + dx,
  };
}
