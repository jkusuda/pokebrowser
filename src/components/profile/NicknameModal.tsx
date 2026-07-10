"use client";

import { useState } from "react";
import { Pokemon } from "@/types";
import { getPokemonName } from "@/lib/pokemon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { postJson } from "@/lib/client-api";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { errorMessage } from "@/lib/utils";

const MAX_NICKNAME_LENGTH = 12;

type Props = {
  pokemon: Pokemon;
  onClose: () => void;
  onSaved?: (nickname: string) => void;
};

export default function NicknameModal({ pokemon, onClose, onSaved }: Props) {
  const [nickname, setNickname] = useState(pokemon.nickname ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useRefresh();

  const defaultName = getPokemonName(pokemon.pokedex_number);
  const defaultNameCapitalized = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

  async function handleSave() {
    const finalNickname = nickname.trim() || defaultNameCapitalized;
    setLoading(true);
    setError(null);
    try {
      await postJson(
        "/api/pokemon/nickname",
        { pokemonId: pokemon.id, nickname: finalNickname },
        "Failed to update nickname"
      );
      refresh();
      onSaved?.(finalNickname);
      onClose();
    } catch (err) {
      setError(errorMessage(err) || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={loading ? undefined : onClose}>
      <Card
        variant="game"
        tone="cream"
        className="relative z-10 w-full max-w-sm mx-4 overflow-hidden p-0 gap-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-pb-grass">
          <h2 className="text-emboss text-xl">NICKNAME</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="font-black text-xl text-black hover:opacity-70 h-auto w-auto p-1"
          >
            ✕
          </Button>
        </div>

        <div className="p-6 flex flex-col gap-3">
          <label className="font-black text-[13px] text-black block tracking-wide uppercase">
            NAME
          </label>
          <Input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, MAX_NICKNAME_LENGTH))}
            maxLength={MAX_NICKNAME_LENGTH}
            placeholder={defaultNameCapitalized}
            autoFocus
            className="shadow-inner"
          />
          <p className="font-bold text-xs text-black/60 text-right uppercase tracking-wide">
            {nickname.length} / {MAX_NICKNAME_LENGTH}
          </p>
          <p className="font-bold text-xs text-black/50">
            Leave blank to use the default name ({defaultNameCapitalized}).
          </p>

          {error && <p className="font-bold text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex gap-4 mt-2">
            <Button onClick={onClose} variant="game" tone="mint" className="flex-1 h-auto py-3 text-[15px] tracking-wide">
              CANCEL
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              variant="game"
              tone="neutral"
              className="flex-1 h-auto py-3 text-[15px] tracking-wide bg-white hover:bg-white"
            >
              {loading ? "..." : "SAVE"}
            </Button>
          </div>
        </div>
      </Card>
    </ModalShell>
  );
}
