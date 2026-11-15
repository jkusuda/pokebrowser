"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import type { DexEntry } from "api-client";
import { getPokedexSprite } from "@/lib/pokemon";
import { getFamilyId, getPokemonData } from "pokemon-data";
import { api } from "@/lib/api";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { cn, errorMessage } from "@/lib/utils";

interface Props {
  pokedex: DexEntry[];
  pendingLevels: number;
}

export default function CandySelectionModal({ pokedex, pendingLevels }: Props) {
  const { refresh } = useRefresh();
  const [remaining, setRemaining] = useState(pendingLevels);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const sorted = [...pokedex].sort((a, b) => a.pokedexNumber - b.pokedexNumber);

  const filtered = searchQuery.trim()
    ? sorted.filter((u) => {
        const data = getPokemonData(u.pokedexNumber);
        return data?.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      })
    : sorted;

  async function handleClaim() {
    if (selected === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.claimCandy(selected);
      setSelected(null);
      setRemaining((r) => r - 1);
      // Re-sync server props so the granted candies show up in the collection.
      refresh();
    } catch (err) {
      setError(errorMessage(err) || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (remaining <= 0) return null;

  return (
    /* Blocking modal — no onClose; the only way out is claiming every reward. */
    <ModalShell className="z-50" backdropClassName="bg-black/60 backdrop-blur-none">
      <div className="relative z-10 bg-pb-bg border-4 border-black rounded-xl shadow-[6px_6px_0_black] p-6 max-w-md w-full mx-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="text-center mb-4 shrink-0">
          <h2 className="text-emboss text-xl">Level Up!</h2>
          <p className="text-sm text-black/70 mt-1">
            Choose a Pokémon to receive <strong>10 candies</strong>.
          </p>
          {remaining > 1 && (
            <p className="text-xs text-pb-primary font-bold mt-1">
              {remaining} rewards remaining
            </p>
          )}
        </div>

        {/* Search */}
        <Input
          type="text"
          placeholder="Search Pokémon..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-3 px-3 py-2 text-sm border-2 bg-white/80 rounded-lg shrink-0"
        />

        {/* Pokémon grid */}
        <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
          <div className="grid grid-cols-5 gap-2">
            {filtered.map((unlock) => {
              const data = getPokemonData(unlock.pokedexNumber);
              const isSelected = selected === unlock.pokedexNumber;
              return (
                <button
                  key={unlock.pokedexNumber}
                  onClick={() => setSelected(unlock.pokedexNumber)}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg border-2 transition-all cursor-pointer",
                    isSelected
                      ? "border-black bg-pb-accent shadow-[2px_2px_0_black] scale-105"
                      : "border-black/20 bg-white/50 hover:border-pb-primary hover:bg-pb-surface/50"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPokedexSprite(unlock.pokedexNumber)}
                    alt={data?.name ?? `#${unlock.pokedexNumber}`}
                    className="w-10 h-10 object-contain"
                  />
                  <span className="text-[0.5625rem] font-bold capitalize leading-none mt-0.5 text-center text-black/70">
                    {data?.name ?? `#${unlock.pokedexNumber}`}
                  </span>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-black/40 py-8">No Pokémon found.</p>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-600 text-center mt-3 shrink-0">{error}</p>
        )}

        {/* Confirm */}
        <div className="mt-4 shrink-0">
          <Button
            variant="game"
            tone="primary"
            size="md"
            className="w-full [-webkit-text-stroke:0px] [text-shadow:-1px_-1px_0_black,1px_-1px_0_black,-1px_1px_0_black,1px_1px_0_black]"
            onClick={handleClaim}
            disabled={selected === null || submitting}
          >
            {submitting
              ? "Claiming..."
              : selected
              ? `Give 10 ${getPokemonData(getFamilyId(selected))?.name ?? `#${selected}`} candies`
              : "Select a Pokémon"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
