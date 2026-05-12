import { POKEMON, type PokemonData } from "./pokemon";

export type Generation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface GenerationInfo {
  start: number;
  end: number;
  name: string;
}

export const GENERATIONS: Record<Generation, GenerationInfo> = {
  1: { start: 1, end: 151, name: "Kanto" },
  2: { start: 152, end: 251, name: "Johto" },
  3: { start: 252, end: 386, name: "Hoenn" },
  4: { start: 387, end: 493, name: "Sinnoh" },
  5: { start: 494, end: 649, name: "Unova" },
  6: { start: 650, end: 721, name: "Kalos" },
  7: { start: 722, end: 809, name: "Alola" },
  8: { start: 810, end: 905, name: "Galar" },
  9: { start: 906, end: 1025, name: "Paldea" },
};

export function getGenerationRange(gen: Generation): GenerationInfo {
  return GENERATIONS[gen];
}

export function getPokemonsByGeneration(gen: Generation): PokemonData[] {
  const { start, end } = GENERATIONS[gen];
  const result: PokemonData[] = [];
  for (let i = start; i <= end; i++) {
    const data = POKEMON[i];
    if (data) result.push(data);
  }
  return result;
}

export function getRandomPokemonId(gen: Generation): number {
  const { start, end } = GENERATIONS[gen];
  return Math.floor(Math.random() * (end - start + 1)) + start;
}
