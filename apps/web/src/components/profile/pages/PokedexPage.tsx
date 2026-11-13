"use client";

import { PokedexOverlay } from "./PokedexOverlay";
import type { DexEntry, Pokemon } from "api-client";

type Props = {
  pokemon: Pokemon[];
  pokedex: DexEntry[];
};

export default function PokedexPage({ pokemon, pokedex }: Props) {
  return (
    <div className="w-full flex-1 flex flex-col">
      <PokedexOverlay pokemon={pokemon} pokedex={pokedex} />
    </div>
  );
}
