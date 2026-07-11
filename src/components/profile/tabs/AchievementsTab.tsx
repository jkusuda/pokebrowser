"use client";

import { useState } from "react";
import AchievementCard from "@/components/achievements/AchievementCard";
import TypePickerModal from "@/components/rewards/TypePickerModal";
import TokenEncounterModal from "@/components/rewards/TokenEncounterModal";
import DevToolsPanel from "./DevToolsPanel";
import { Button } from "@/components/ui/button";
import {
  ACHIEVEMENTS_BY_CATEGORY,
  CATEGORY_LABELS,
  ACHIEVEMENT_BY_ID,
  type AchievementCategory,
} from "@/lib/achievements-data";
import { AchievementUnlock, Token, PokedexUnlock, UserStats } from "@/types";
import { postJson } from "@/lib/client-api";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: AchievementCategory[] = [
  "catch", "website", "streak", "pokedex", "shiny", "level",
  "type", "legendary", "social", "customization",
];

interface Props {
  achievementUnlocks: AchievementUnlock[];
  tokens: Token[];
  pokedexUnlocks: PokedexUnlock[];
  userStats: UserStats | null;
  userLevel: number;
  friendCount: number;
}

/** Compute rough progress percentage (0–100) for a given achievement */
function getProgress(
  achievementId: string,
  userStats: UserStats | null,
  userLevel: number,
  friendCount: number,
  pokedexCount: number
): number {
  const def = ACHIEVEMENT_BY_ID[achievementId];
  if (!def) return 0;

  switch (def.trigger) {
    case "catch_count":
      return Math.min(100, ((userStats?.total_catches ?? 0) / def.threshold) * 100);
    case "site_count":
      return Math.min(100, (((userStats?.caught_websites ?? []).length) / def.threshold) * 100);
    case "streak":
      return Math.min(100, ((userStats?.current_streak ?? 0) / def.threshold) * 100);
    case "level":
      return Math.min(100, (userLevel / def.threshold) * 100);
    case "friend_count":
      return Math.min(100, (friendCount / def.threshold) * 100);
    case "pokedex_complete":
      return Math.min(100, (pokedexCount / def.threshold) * 100);
    case "shiny_complete":
      // Shiny dex count isn't stored in userStats — can't show accurate progress
      return 0;
    case "type_coverage":
      return Math.min(100, (((userStats?.types_caught ?? []).length) / def.threshold) * 100);
    default:
      return 0;
  }
}

export default function AchievementsTab({
  achievementUnlocks,
  tokens,
  pokedexUnlocks,
  userStats,
  userLevel,
  friendCount,
}: Props) {
  const { refresh } = useRefresh();
  const [localUnlocks, setLocalUnlocks] = useState<AchievementUnlock[]>(achievementUnlocks);
  const [localTokens, setLocalTokens] = useState<Token[]>(tokens);
  const [typePickerToken, setTypePickerToken] = useState<Token | null>(null);
  const [openingToken, setOpeningToken] = useState<Token | null>(null);
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");

  const unlockById = Object.fromEntries(localUnlocks.map((u) => [u.achievement_id, u]));
  const pokedexCount = pokedexUnlocks.length;

  async function handleClaim(achievementId: string) {
    const { tokenGranted, tokenId } = await postJson<{
      tokenGranted: Token["token_type"] | null;
      tokenId: string | null;
    }>("/api/achievements/claim", { achievementId }, "Failed to claim");

    // Optimistically mark as claimed
    setLocalUnlocks((prev) =>
      prev.map((u) =>
        u.achievement_id === achievementId
          ? { ...u, claimed_at: new Date().toISOString() }
          : u
      )
    );

    // A granted token opens immediately — type_pick asks for a type first.
    // It's also added to local state so it lands in the Unopened Tokens
    // inventory if the user backs out of the picker or the open fails.
    if (tokenGranted && tokenId) {
      const newToken: Token = {
        id: tokenId,
        user_id: "",
        token_type: tokenGranted,
        type_filter: null,
        created_at: new Date().toISOString(),
        used_at: null,
      };
      setLocalTokens((prev) => [...prev, newToken]);
      if (tokenGranted === "type_pick") {
        setTypePickerToken(newToken);
      } else {
        setOpeningToken(newToken);
      }
    }

    // Re-sync server props (storage reward on catch_limit, real token row).
    refresh();
  }

  function handleTypeSelected(token: Token, typeName: string) {
    setLocalTokens((prev) =>
      prev.map((t) => (t.id === token.id ? { ...t, type_filter: typeName } : t))
    );
    setTypePickerToken(null);
    // Type chosen → summon the encounter right away.
    setOpeningToken({ ...token, type_filter: typeName });
  }

  function handleEncounterClose(opened: boolean) {
    if (opened && openingToken) {
      setLocalTokens((prev) => prev.filter((t) => t.id !== openingToken.id));
    }
    setOpeningToken(null);
  }

  const unclaimedCount = localUnlocks.filter((u) => u.claimed_at === null).length;

  return (
    <div className="space-y-4">
      {process.env.NODE_ENV !== "production" && <DevToolsPanel />}

      {/* Filter strip */}
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

      {/* Unopened tokens inventory — each one summons an encounter when opened */}
      {localTokens.length > 0 && (
        <div className="bg-pb-surface border-2 border-pb-primary rounded-lg p-3">
          <h3 className="font-black text-xs uppercase tracking-widest text-pb-ink mb-2">
            🎁 Unopened Tokens
          </h3>
          <div className="flex flex-wrap gap-2">
            {localTokens.map((token) => {
              const needsType =
                token.token_type === "type_pick" && token.type_filter === null;
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
                  <span className="text-base">
                    {token.token_type === "legendary" ? "🌟" :
                     token.token_type === "mythical" ? "🔮" :
                     token.token_type === "shiny" ? "✨" : "💎"}
                  </span>
                  <span className="text-[10px] font-black uppercase">
                    {needsType
                      ? "Choose Type ▼"
                      : `Open ${
                          token.token_type === "type_pick"
                            ? `${token.type_filter} type`
                            : token.token_type
                        }`}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Achievements by category */}
      {CATEGORY_ORDER.map((category) => {
        const defs = ACHIEVEMENTS_BY_CATEGORY[category] ?? [];
        const filteredDefs = defs.filter((def) => {
          const unlock = unlockById[def.id] ?? null;
          if (filter === "earned") return unlock !== null;
          if (filter === "locked") return unlock === null;
          return true;
        });
        if (filteredDefs.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="font-black text-xs uppercase tracking-widest text-pb-ink mb-2 flex items-center gap-1.5">
              {CATEGORY_LABELS[category]}
              <span className="text-black/30 font-normal normal-case tracking-normal">
                ({defs.filter((d) => unlockById[d.id]).length}/{defs.length})
              </span>
            </h3>
            <div className="space-y-2">
              {filteredDefs.map((def) => {
                const unlock = unlockById[def.id] ?? null;
                const progress = unlock
                  ? 100
                  : getProgress(def.id, userStats, userLevel, friendCount, pokedexCount);
                return (
                  <AchievementCard
                    key={def.id}
                    def={def}
                    unlock={unlock}
                    progress={progress}
                    onClaim={handleClaim}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Type picker modal */}
      {typePickerToken && (
        <TypePickerModal
          tokenId={typePickerToken.id}
          onClose={() => setTypePickerToken(null)}
          onSelected={(typeName) => handleTypeSelected(typePickerToken, typeName)}
        />
      )}

      {/* Token encounter (lootbox) modal */}
      {openingToken && (
        <TokenEncounterModal token={openingToken} onClose={handleEncounterClose} />
      )}
    </div>
  );
}
