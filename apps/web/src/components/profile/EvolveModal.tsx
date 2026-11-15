"use client";

import { useEffect, useRef, useState } from "react";
import type { Pokemon } from "api-client";
import type { PokemonData } from "pokemon-data";
import { getPokemonSprite } from "@/lib/pokemon";
import { getPokemonName } from "pokemon-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal-shell";
import { api } from "@/lib/api";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { cn, errorMessage } from "@/lib/utils";

const ANIMATION_MS = 1800;

type Phase = "confirm" | "evolving" | "done" | "error";

type Props = {
  pokemon: Pokemon;
  pokemonInfo: PokemonData;
  /** Every species this can evolve into. Branching lines pass more than one. */
  targets: number[];
  familyName: string;
  onClose: () => void;
};

export default function EvolveModal({ pokemon, pokemonInfo, targets, familyName, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [error, setError] = useState<string | null>(null);
  const [targetNumber, setTargetNumber] = useState(targets[0]);
  const { refresh } = useRefresh();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const fromName = pokemon.nickname || getPokemonName(pokemon.pokedexNumber);
  const toName = getPokemonName(targetNumber);
  const cost = pokemonInfo.evolveCandyCost ?? 0;
  const isBranching = targets.length > 1;
  // During "evolving" the sprite shows the original; it swaps to the evolved
  // form once the animation completes (the "done" phase).
  const spriteNumber = phase === "done" ? targetNumber : pokemon.pokedexNumber;

  async function handleEvolve() {
    setPhase("evolving");
    setError(null);
    try {
      await api.evolvePokemon(pokemon.id, targetNumber);

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
        <div className="flex items-center justify-center px-6 py-4 border-b-4 border-black bg-pb-accent">
          <h2 className="text-emboss text-xl">EVOLVE</h2>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          {/* Target chooser — branching lines only (Eevee, Tyrogue, Gloom, …) */}
          {isBranching && phase === "confirm" && (
            <div className="w-full">
              <p className="text-[0.625rem] font-black uppercase tracking-widest text-black/50 text-center mb-2">
                Choose an evolution
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {targets.map((id) => {
                  const selected = id === targetNumber;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTargetNumber(id)}
                      aria-pressed={selected}
                      title={getPokemonName(id)}
                      className={cn(
                        "h-14 w-14 rounded-[10px] border-4 flex items-center justify-center transition-transform",
                        selected
                          ? "border-black bg-pb-accent -translate-y-0.5 shadow-[2px_2px_0_black]"
                          : "border-black/20 bg-white/60 hover:border-black/50"
                      )}
                    >
                      <img
                        src={getPokemonSprite(id, pokemon.isShiny)}
                        alt={getPokemonName(id)}
                        className={cn("h-11 w-11 object-contain", !selected && "opacity-60")}
                        style={{ imageRendering: "pixelated" }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sprite stage */}
          <div className="relative h-28 w-28 flex items-center justify-center">
            <img
              src={getPokemonSprite(spriteNumber, pokemon.isShiny)}
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
            <p className="text-center font-bold text-sm text-pb-ink capitalize">
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
            <div className="h-[2.625rem]" aria-hidden="true" />
          )}
        </div>
      </Card>
    </ModalShell>
  );
}
