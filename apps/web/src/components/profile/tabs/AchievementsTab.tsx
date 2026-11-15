"use client";

import { useState } from "react";
import AchievementCard from "./AchievementCard";
import TypePickerModal from "@/components/rewards/TypePickerModal";
import TokenEncounterModal from "@/components/rewards/TokenEncounterModal";
import { Button } from "@/components/ui/button";
import {
  ACHIEVEMENTS_BY_CATEGORY,
  CATEGORY_LABELS,
  type AchievementCategory,
} from "@/lib/achievements-data";
import type { Achievement, PokemonType, Token } from "api-client";
import { getPokemonName } from "pokemon-data";
import { getPokedexSprite } from "@/lib/pokemon";
import { api } from "@/lib/api";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: AchievementCategory[] = [
  "catch", "website", "streak", "pokedex", "shiny", "level",
  "type", "legendary", "event", "social", "customization",
];

interface Props {
  achievements: Achievement[];
  tokens: Token[];
}

export default function AchievementsTab({ achievements, tokens }: Props) {
  const { refresh } = useRefresh();
  const [localAchievements, setLocalAchievements] = useState<Achievement[]>(achievements);
  const [localTokens, setLocalTokens] = useState<Token[]>(tokens);
  const [typePickerToken, setTypePickerToken] = useState<Token | null>(null);
  const [openingToken, setOpeningToken] = useState<Token | null>(null);
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");

  const achievementById = Object.fromEntries(localAchievements.map((a) => [a.id, a]));

  async function handleClaim(achievementId: string) {
    const { tokenGranted, tokenId } = await api.claimAchievement(achievementId);

    setLocalAchievements((prev) =>
      prev.map((a) =>
        a.id === achievementId ? { ...a, claimedAt: new Date().toISOString() } : a
      )
    );

    // A granted token opens immediately — type_pick asks for a type first.
    // It's also added to local state so it lands in the Unopened Tokens
    // inventory if the user backs out of the picker or the open fails.
    if (tokenGranted && tokenId) {
      const newToken: Token = {
        id: tokenId,
        tokenType: tokenGranted,
        typeFilter: null,
        pokedexNumber: null,
        eventId: null,
        createdAt: new Date().toISOString(),
      };
      setLocalTokens((prev) => [...prev, newToken]);
      if (tokenGranted === "type_pick") {
        setTypePickerToken(newToken);
      } else {
        setOpeningToken(newToken);
      }
    }

    // Re-sync server props (storage reward, real token row).
    refresh();
  }

  function handleTypeSelected(token: Token, typeName: PokemonType) {
    setLocalTokens((prev) =>
      prev.map((t) => (t.id === token.id ? { ...t, typeFilter: typeName } : t))
    );
    setTypePickerToken(null);
    // Type chosen → summon the encounter right away.
    setOpeningToken({ ...token, typeFilter: typeName });
  }

  function handleEncounterClose(opened: boolean) {
    if (opened && openingToken) {
      setLocalTokens((prev) => prev.filter((t) => t.id !== openingToken.id));
    }
    setOpeningToken(null);
  }

  const unclaimedCount = localAchievements.filter((a) => a.unlockedAt !== null && a.claimedAt === null).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["all", "earned", "locked"] as const).map((f) => (
          <Button
            key={f}
            variant="ghost"
            size="sm"
            onClick={() => setFilter(f)}
            className={cn(
              "h-auto px-3 py-1 rounded-full text-xs font-bold uppercase border-2",
              filter === f
                ? "border-black bg-pb-primary text-white shadow-[2px_2px_0_black] hover:bg-pb-primary hover:text-white"
                : "border-black/20 bg-white/60 text-black/50 hover:border-pb-primary"
            )}
          >
            {f === "earned" && unclaimedCount > 0 ? `Earned (${unclaimedCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {localTokens.length > 0 && (
        <div className="bg-pb-surface border-2 border-pb-primary rounded-lg p-3">
          <h3 className="font-black text-xs uppercase tracking-widest text-pb-ink mb-2">
            🎁 Unopened Tokens
          </h3>
          <div className="flex flex-wrap gap-2">
            {localTokens.map((token) => {
              const needsType =
                token.tokenType === "type_pick" && token.typeFilter === null;
              return (
                <Button
                  key={token.id}
                  variant="game"
                  size="sm"
                  disabled={openingToken !== null || typePickerToken !== null}
                  onClick={() =>
                    needsType ? setTypePickerToken(token) : setOpeningToken(token)
                  }
                  className={cn(
                    "flex items-center gap-1.5 h-auto px-2.5 py-1.5 border-2 rounded-lg shadow-[2px_2px_0_black] !text-black [-webkit-text-stroke:0px] [text-shadow:none]",
                    needsType
                      ? "bg-amber-400 hover:bg-amber-500 active:bg-amber-500"
                      : "bg-pb-accent hover:bg-pb-accent-deep active:bg-pb-accent-deep"
                  )}
                >
                  {token.tokenType === "species" && token.pokedexNumber !== null ? (
                    <img
                      src={getPokedexSprite(token.pokedexNumber)}
                      alt=""
                      className="w-6 h-6 -my-1 [image-rendering:pixelated]"
                    />
                  ) : (
                    <span className="text-base">
                      {token.tokenType === "legendary" ? "🌟" :
                       token.tokenType === "mythical" ? "🔮" :
                       token.tokenType === "shiny" ? "✨" : "💎"}
                    </span>
                  )}
                  <span className="text-[0.625rem] font-black uppercase">
                    {needsType
                      ? "Choose Type ▼"
                      : `Open ${
                          token.tokenType === "type_pick"
                            ? `${token.typeFilter} type`
                            : token.tokenType === "species" && token.pokedexNumber !== null
                              ? getPokemonName(token.pokedexNumber)
                              : token.tokenType
                        }`}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {CATEGORY_ORDER.map((category) => {
        const defs = ACHIEVEMENTS_BY_CATEGORY[category] ?? [];
        const filteredDefs = defs.filter((def) => {
          const earned = achievementById[def.id]?.unlockedAt != null;
          if (filter === "earned") return earned;
          if (filter === "locked") return !earned;
          return true;
        });
        if (filteredDefs.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="font-black text-xs uppercase tracking-widest text-pb-ink mb-2 flex items-center gap-1.5">
              {CATEGORY_LABELS[category]}
              <span className="text-black/30 font-normal normal-case tracking-normal">
                ({defs.filter((d) => achievementById[d.id]?.unlockedAt).length}/{defs.length})
              </span>
            </h3>
            <div className="space-y-2">
              {filteredDefs.map((def) => {
                const achievement = achievementById[def.id];
                return (
                  <AchievementCard
                    key={def.id}
                    def={def}
                    achievement={achievement}
                    onClaim={handleClaim}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {typePickerToken && (
        <TypePickerModal
          tokenId={typePickerToken.id}
          onClose={() => setTypePickerToken(null)}
          onSelected={(typeName) => handleTypeSelected(typePickerToken, typeName)}
        />
      )}

      {openingToken && (
        <TokenEncounterModal token={openingToken} onClose={handleEncounterClose} />
      )}
    </div>
  );
}
