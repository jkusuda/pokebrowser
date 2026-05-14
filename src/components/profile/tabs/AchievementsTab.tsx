"use client";

import { useState } from "react";
import AchievementCard from "@/components/achievements/AchievementCard";
import TypePickerModal from "@/components/rewards/TypePickerModal";
import {
  ACHIEVEMENTS_BY_CATEGORY,
  CATEGORY_LABELS,
  ACHIEVEMENT_BY_ID,
  type AchievementCategory,
} from "@/lib/achievements-data";
import { AchievementUnlock, Token, PokedexUnlock, UserStats } from "@/types";
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
  const [localUnlocks, setLocalUnlocks] = useState<AchievementUnlock[]>(achievementUnlocks);
  const [localTokens, setLocalTokens] = useState<Token[]>(tokens);
  const [typePickerToken, setTypePickerToken] = useState<Token | null>(null);
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");

  const unlockById = Object.fromEntries(localUnlocks.map((u) => [u.achievement_id, u]));
  const pokedexCount = pokedexUnlocks.length;

  // Active (configured) tokens ready to use
  const readyTokens = localTokens.filter(
    (t) => t.token_type !== "type_pick" || t.type_filter !== null
  );
  // type_pick tokens waiting for type selection
  const pendingTypeTokens = localTokens.filter(
    (t) => t.token_type === "type_pick" && t.type_filter === null
  );

  async function handleClaim(achievementId: string) {
    const res = await fetch("/api/achievements/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ achievementId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Failed to claim");
    const { tokenGranted } = json;

    // Optimistically mark as claimed
    setLocalUnlocks((prev) =>
      prev.map((u) =>
        u.achievement_id === achievementId
          ? { ...u, claimed_at: new Date().toISOString() }
          : u
      )
    );

    // If a token was granted, add it to local state
    if (tokenGranted) {
      const newToken: Token = {
        id: crypto.randomUUID(),
        user_id: "",
        token_type: tokenGranted,
        type_filter: null,
        created_at: new Date().toISOString(),
        used_at: null,
      };
      setLocalTokens((prev) => [...prev, newToken]);
    }
  }

  function handleTypeSelected(tokenId: string, typeName: string) {
    setLocalTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, type_filter: typeName } : t))
    );
    setTypePickerToken(null);
  }

  const unclaimedCount = localUnlocks.filter((u) => u.claimed_at === null).length;

  return (
    <div className="space-y-4">
      {/* Filter strip */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "earned", "locked"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase border-2 transition-all",
              filter === f
                ? "border-black bg-pb-pine text-white shadow-[2px_2px_0_black]"
                : "border-black/20 bg-white/60 text-black/50 hover:border-pb-pine"
            )}
          >
            {f === "earned" && unclaimedCount > 0 ? `Earned (${unclaimedCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Active tokens section */}
      {(readyTokens.length > 0 || pendingTypeTokens.length > 0) && (
        <div className="bg-pb-leaf border-2 border-pb-pine rounded-lg p-3">
          <h3 className="font-black text-xs uppercase tracking-widest text-pb-forest mb-2">
            🎫 Active Tokens
          </h3>
          <div className="flex flex-wrap gap-2">
            {readyTokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-pb-grass border-2 border-black rounded-lg shadow-[2px_2px_0_black]"
              >
                <span className="text-base">
                  {token.token_type === "legendary" ? "🌟" :
                   token.token_type === "mythical" ? "🔮" :
                   token.token_type === "shiny" ? "✨" : "💎"}
                </span>
                <span className="text-[10px] font-black uppercase text-white [text-shadow:0_1px_0_black]">
                  {token.token_type === "type_pick"
                    ? `${token.type_filter} type`
                    : token.token_type}
                </span>
              </div>
            ))}
            {pendingTypeTokens.map((token) => (
              <button
                key={token.id}
                onClick={() => setTypePickerToken(token)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-400 border-2 border-black rounded-lg shadow-[2px_2px_0_black] hover:bg-amber-500 transition-colors"
              >
                <span className="text-base">💎</span>
                <span className="text-[10px] font-black uppercase text-black">
                  Choose Type ▼
                </span>
              </button>
            ))}
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
            <h3 className="font-black text-xs uppercase tracking-widest text-pb-forest mb-2 flex items-center gap-1.5">
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
          onSelected={(typeName) => handleTypeSelected(typePickerToken.id, typeName)}
        />
      )}
    </div>
  );
}
