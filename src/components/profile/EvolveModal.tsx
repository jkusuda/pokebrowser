"use client";

import { useEffect, useRef, useState } from "react";
import { Pokemon, PokemonInfo } from "@/types";
import { getPokemonSprite } from "@/lib/pokemon";
import { getPokemonName } from "pokemon-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal-shell";
import { postJson } from "@/lib/client-api";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { cn, errorMessage } from "@/lib/utils";

const ANIMATION_MS = 1800;

type Phase = "confirm" | "evolving" | "done" | "error";

type Props = {
  pokemon: Pokemon;
  pokemonInfo: PokemonInfo;
  targetNumber: number;
  familyName: string;
  onClose: () => void;
};

export default function EvolveModal({ pokemon, pokemonInfo, targetNumber, familyName, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useRefresh();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const fromName = pokemon.nickname || getPokemonName(pokemon.pokedex_number);
  const toName = getPokemonName(targetNumber);
  const cost = pokemonInfo.evolveCandyCost ?? 0;
  // During "evolving" the sprite shows the original; it swaps to the evolved
  // form once the animation completes (the "done" phase).
  const spriteNumber = phase === "done" ? targetNumber : pokemon.pokedex_number;

  async function handleEvolve() {
    setPhase("evolving");
    setError(null);
    try {
      await postJson("/api/pokemon/evolve", { pokemonId: pokemon.id }, "Failed to evolve");

      // Let the flash/pulse play before revealing the evolved sprite.
      timers.current.push(
        setTimeout(() => {
          setPhase("done");
          refresh();
          // Auto-close shortly after the reveal.
          timers.current.push(setTimeout(onClose, 1400));
        }, ANIMATION_MS)
      );
    } catch (err) {
      setError(errorMessage(err) || "An error occurred");
      setPhase("error");
    }
  }

  return (
    <ModalShell
      onClose={phase === "evolving" ? undefined : onClose}
      backdropClassName="bg-black/60"
    >
      <Card
        variant="game"
        tone="cream"
        className="relative z-10 w-full max-w-sm mx-4 overflow-hidden p-0 gap-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-center px-6 py-4 border-b-4 border-black bg-pb-grass">
          <h2 className="text-emboss text-xl">EVOLVE</h2>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          {/* Sprite stage */}
          <div className="relative h-28 w-28 flex items-center justify-center">
            <img
              src={getPokemonSprite(spriteNumber)}
              alt={phase === "done" ? toName : fromName}
              className={cn(
                "h-24 w-24 object-contain drop-shadow-lg",
                phase === "evolving" && "animate-evolve",
                phase === "done" && "animate-evolve-pop"
              )}
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          {/* Message */}
          {phase === "done" ? (
            <p className="text-center font-bold text-sm text-pb-forest capitalize">
              {fromName} evolved into {toName}!
            </p>
          ) : phase === "error" ? (
            <p className="text-center font-bold text-sm text-red-600">{error}</p>
          ) : (
            <p className="text-center font-bold text-sm text-black/80 capitalize">
              Evolve {fromName} into {toName}?
              <span className="block mt-1 text-xs text-black/60 normal-case">
                Cost: {cost} {familyName} Candy
              </span>
            </p>
          )}

          {/* Actions */}
          {phase === "confirm" || phase === "error" ? (
            <div className="flex gap-3 w-full mt-1">
              <Button onClick={onClose} variant="game" tone="mint" className="flex-1 h-auto py-2.5 text-sm tracking-wide">
                CANCEL
              </Button>
              <Button onClick={handleEvolve} variant="game" tone="primary" className="flex-1 h-auto py-2.5 text-sm tracking-wide">
                {phase === "error" ? "RETRY" : "EVOLVE"}
              </Button>
            </div>
          ) : (
            <div className="h-[42px]" aria-hidden="true" />
          )}
        </div>
      </Card>
    </ModalShell>
  );
}
