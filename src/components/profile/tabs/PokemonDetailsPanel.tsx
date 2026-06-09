import { Pokemon, PokemonInfo, Candy } from "@/types";
import { getPokemonSprite } from "@/lib/pokemon";
import { getFamilyId } from "pokemon-data";
import { getTypeColor, getTypeIconPath } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PokemonDetailsPanelProps {
  pokemon: Pokemon | null;
  pokemonInfo: PokemonInfo | null;
  familyInfo: PokemonInfo | null;
  candies: Candy[];
  isVisible: boolean;
  onClose: () => void;
}

export default function PokemonDetailsPanel({
  pokemon,
  pokemonInfo,
  familyInfo,
  candies,
  isVisible,
  onClose,
}: PokemonDetailsPanelProps) {
  const types = pokemonInfo?.types ?? [];
  const primaryType = types[0] ?? "normal";
  const typeColors = getTypeColor(primaryType);

  return (
    <Card
      className={cn(
        "absolute top-2 bottom-2 right-2 w-[36%] rounded-[20px] shadow-lg transition-transform duration-300 z-20 overflow-hidden p-0 gap-0",
        isVisible ? "translate-x-0" : "translate-x-[110%]"
      )}
      style={{ backgroundColor: `${typeColors.background}cc` }}
    >
      {pokemon && (
        <div className="flex flex-col h-full relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-2 right-3 text-white/70 hover:text-white text-xl font-bold z-30 h-auto w-auto p-1"
          >
            &times;
          </Button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sprite + info card */}
          <div className="relative">
            <img
              src={getPokemonSprite(pokemon.pokedex_number)}
              alt={pokemon.nickname || `#${pokemon.pokedex_number}`}
              className="absolute -top-16 left-1/2 -translate-x-1/2 w-20 h-20 object-contain object-bottom drop-shadow-lg z-20"
              style={{ imageRendering: "pixelated" }}
            />

            {/* White info card */}
            <Card
              variant="game"
              tone="white"
              size="sm"
              shadow="sm"
              className="mx-3 mt-0 rounded-[16px] bg-white/90 pt-4 shrink-0"
            >
              {/* Name + number */}
              <div className="text-center">
                <h3 className="text-lg font-bold capitalize leading-tight">
                  {pokemon.nickname || pokemonInfo?.name?.replace(/-/g, " ") || `Pokemon`}
                </h3>
                <p className="text-xs text-gray-500 font-semibold">
                  #{pokemon.pokedex_number.toString().padStart(3, "0")}
                </p>
              </div>

              {/* Weight | Types | Height row */}
              <div className="flex items-center justify-between text-center text-[11px] gap-1">
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {pokemonInfo ? `${pokemonInfo.weight}kg` : "—"}
                  </p>
                  <p className="text-gray-400 font-semibold text-[9px] uppercase tracking-wide">Weight</p>
                </div>

                <div className="w-px h-8 bg-gray-200" />

                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex gap-1 justify-center">
                    {types.length > 0 ? types.map((t) => (
                      <div
                        key={t}
                        className="w-5 h-5 rounded-full flex items-center justify-center shadow-sm overflow-hidden"
                        style={{ backgroundColor: getTypeColor(t).background, border: `1px solid ${getTypeColor(t).border}` }}
                        title={t}
                      >
                        <img
                          src={getTypeIconPath(t)}
                          alt={t}
                          className="w-3.5 h-3.5 object-contain"
                        />
                      </div>
                    )) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <p className="text-gray-400 font-semibold text-[9px] uppercase tracking-wide">
                    {types.length > 0 ? types.map(t => t.toUpperCase()).join(" / ") : "—"}
                  </p>
                </div>

                <div className="w-px h-8 bg-gray-200" />

                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {pokemonInfo ? `${pokemonInfo.height}m` : "—"}
                  </p>
                  <p className="text-gray-400 font-semibold text-[9px] uppercase tracking-wide">Height</p>
                </div>
              </div>
            </Card>

            {/* Candy row */}
            <Card
              variant="game"
              tone="white"
              size="sm"
              shadow="sm"
              className="mx-3 mt-1.5 rounded-[12px] bg-white/90 flex-row items-center justify-between shrink-0"
            >
              <span className="font-bold text-sm capitalize">
                {familyInfo?.name?.replace(/-/g, " ") ?? pokemonInfo?.name?.replace(/-/g, " ") ?? "Pokémon"} Candy
              </span>
              <span className="font-bold text-sm text-gray-600">
                {pokemon ? (candies?.find(c => c.pokedex_number === getFamilyId(pokemon.pokedex_number))?.count ?? 0) : "—"}
              </span>
            </Card>

            {/* Evolve button */}
            {pokemonInfo?.evolvesTo != null ? (
              <Card
                variant="game"
                tone="leaf"
                size="sm"
                shadow="sm"
                className="mx-3 mt-1.5 rounded-[12px] bg-pb-leaf flex-row items-center justify-between shrink-0 opacity-60"
              >
                <span className="font-bold text-sm text-pb-forest uppercase tracking-wide">Evolve</span>
                <span className="font-bold text-pb-forest/70 bg-white/60 px-3 py-0.5 rounded-full text-xs">
                  {pokemonInfo.evolveCandyCost ?? "—"}
                </span>
              </Card>
            ) : (
              <div className="mx-3 mt-1.5 rounded-[12px] px-4 py-4 shrink-0" aria-hidden="true" />
            )}

            {/* Caught On footer */}
            <Card
              variant="game"
              tone="white"
              size="sm"
              shadow="none"
              className="mx-3 mt-1.5 mb-2 rounded-[12px] bg-white/70 text-center shrink-0"
            >
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-0.5">
                Caught On
              </p>
              {pokemon.caught_on && (
                <p className="text-xs font-bold text-gray-700">{pokemon.caught_on}</p>
              )}
              <p className="text-xs text-gray-500">
                {pokemon.caught_at
                  ? new Date(pokemon.caught_at).toLocaleDateString("en-US", {
                    month: "numeric",
                    day: "numeric",
                    year: "numeric",
                  })
                  : "Unknown"}
              </p>
            </Card>
          </div>
        </div>
      )}
    </Card>
  );
}
