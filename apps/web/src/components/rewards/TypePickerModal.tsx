"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { POKEMON_TYPES, getTypeIconPath, getTypeColor } from "@/lib/type-styles";
import { api } from "@/lib/api";
import type { PokemonType } from "api-client";
import { cn, errorMessage } from "@/lib/utils";

interface Props {
  tokenId: string;
  onClose: () => void;
  onSelected: (type: PokemonType) => void;
}

export default function TypePickerModal({ tokenId, onClose, onSelected }: Props) {
  const [selected, setSelected] = useState<PokemonType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.setTokenType(tokenId, selected);
      onSelected(selected);
    } catch (err) {
      setError(errorMessage(err) || "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose} className="z-50" backdropClassName="bg-black/60 backdrop-blur-none">
      <div
        className="relative z-10 bg-pb-bg border-4 border-black rounded-xl shadow-[6px_6px_0_black] p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="text-emboss text-xl text-center mb-1">Choose a Type</h2>
        <p className="text-center text-xs text-black/60 mb-4">
          Summon a Pokémon of this type!
        </p>

        {/* Type grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {POKEMON_TYPES.map((type) => {
            const { background, border } = getTypeColor(type);
            const isSelected = selected === type;
            return (
              <button
                key={type}
                onClick={() => setSelected(type)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all cursor-pointer",
                  isSelected
                    ? "scale-105 shadow-[2px_2px_0_black]"
                    : "opacity-80 hover:opacity-100 hover:scale-105"
                )}
                style={{
                  borderColor: isSelected ? "black" : border,
                  background: isSelected ? background : `${background}80`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getTypeIconPath(type)}
                  alt={type}
                  className="w-6 h-6 object-contain"
                />
                <span className="text-[0.5625rem] font-black uppercase text-white [text-shadow:0_1px_0_rgba(0,0,0,0.8)] leading-none">
                  {type}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-red-600 text-center mb-3">{error}</p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <Button variant="game" tone="neutral" size="sm" className="flex-1" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="game"
            tone="primary"
            size="sm"
            className="flex-1"
            onClick={handleConfirm}
            disabled={!selected || submitting}
          >
            {submitting ? "Saving..." : "Summon"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
