"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PokedexUnlock } from "@/types";
import { getPokemonData, getPokedexSprite } from "@/lib/pokemon";
import { errorMessage } from "@/lib/api-helpers";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { cn } from "@/lib/utils";

interface Props {
  pokedexUnlocks: PokedexUnlock[];
  pendingLevels: number;
}

export default function CandySelectionModal({ pokedexUnlocks, pendingLevels }: Props) {
  const { refresh } = useRefresh();
  const [remaining, setRemaining] = useState(pendingLevels);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Sort unlocks by pokedex number for predictable order
  const sorted = [...pokedexUnlocks].sort((a, b) => a.pokedex_number - b.pokedex_number);

  const filtered = searchQuery.trim()
    ? sorted.filter((u) => {
        const data = getPokemonData(u.pokedex_number);
        return data?.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      })
    : sorted;

  async function handleClaim() {
    if (selected === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/rewards/claim-candy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pokedexNumber: selected }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to claim");
      }
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
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-pb-bg border-4 border-black rounded-xl shadow-[6px_6px_0_black] p-6 max-w-md w-full mx-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="text-center mb-4 shrink-0">
          <h2 className="text-emboss text-xl">Level Up!</h2>
          <p className="text-sm text-black/70 mt-1">
            Choose a Pokémon to receive <strong>10 candies</strong>.
          </p>
          {remaining > 1 && (
            <p className="text-xs text-pb-pine font-bold mt-1">
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
              const data = getPokemonData(unlock.pokedex_number);
              const isSelected = selected === unlock.pokedex_number;
              return (
                <button
                  key={unlock.pokedex_number}
                  onClick={() => setSelected(unlock.pokedex_number)}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg border-2 transition-all cursor-pointer",
                    isSelected
                      ? "border-black bg-pb-grass shadow-[2px_2px_0_black] scale-105"
                      : "border-black/20 bg-white/50 hover:border-pb-pine hover:bg-pb-leaf/50"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPokedexSprite(unlock.pokedex_number)}
                    alt={data?.name ?? `#${unlock.pokedex_number}`}
                    className="w-10 h-10 object-contain"
                  />
                  <span className="text-[9px] font-bold capitalize leading-none mt-0.5 text-center text-black/70">
                    {data?.name ?? `#${unlock.pokedex_number}`}
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
              ? `Give 10 candies to ${getPokemonData(selected)?.name ?? `#${selected}`}`
              : "Select a Pokémon"}
          </Button>
        </div>
      </div>
    </div>
  );
}
