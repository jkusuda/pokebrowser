"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AchievementDef } from "@/lib/achievements-data";
import { AchievementUnlock } from "@/types";
import { cn } from "@/lib/utils";
import { StaticImageData } from "next/image";

// ── Local sprite imports ────────────────────────────────────────────────────
import pokeImg        from "@/assets/achievements/poke.png";
import greatImg       from "@/assets/achievements/great.png";
import ultraImg       from "@/assets/achievements/ultra.png";
import masterImg      from "@/assets/achievements/master.png";
import crownPassImg   from "@/assets/achievements/crown-pass.png";
import brickMailImg   from "@/assets/achievements/brick-mail.png";
import cherishImg     from "@/assets/achievements/cherish.png";
import friendImg      from "@/assets/achievements/friend.png";
import luxuryImg      from "@/assets/achievements/luxury.png";
import catchCharmImg  from "@/assets/achievements/catching-charm.png";
import fireImg        from "@/assets/achievements/fire.png";
import pokeRadarImg   from "@/assets/achievements/poke-radar.png";
import shinyCharmImg  from "@/assets/achievements/shiny-charm.png";
import weaknessImg    from "@/assets/achievements/weakness-policy.png";
import autographImg   from "@/assets/achievements/autograph.png";
import ribbonImg      from "@/assets/achievements/ribbon.png";
import dragonSkullImg from "@/assets/achievements/dragon-skull.png";

/** Maps achievement id → sprite. All level achievements share the ribbon. */
const ACHIEVEMENT_SPRITES: Record<string, StaticImageData> = {
  first_steps:          pokeImg,
  getting_started:      greatImg,
  collector:            ultraImg,
  master_collector:     masterImg,
  explorer:             crownPassImg,
  web_surfer:           crownPassImg,
  netizen:              crownPassImg,
  letting_go:           brickMailImg,
  that_sounds_better:   cherishImg,
  friendly:             friendImg,
  social_butterfly:     luxuryImg,
  just_my_type:         catchCharmImg,
  dedicated:            fireImg,
  love_of_the_game:     fireImg,
  gotta_catch_em_all:   pokeRadarImg,
  lucky_color:          shinyCharmImg,
  shiny_hunter:         shinyCharmImg,
  identity_crisis:      weaknessImg,
  new_look:             autographImg,
  level_5:              ribbonImg,
  level_10:             ribbonImg,
  level_20:             ribbonImg,
  level_30:             ribbonImg,
  level_40:             ribbonImg,
  level_50:             ribbonImg,
  legendary_encounter:  dragonSkullImg,
};

const TOKEN_LABELS: Record<string, string> = {
  legendary: "Legendary token",
  mythical: "Mythical token",
  type_pick: "Type token",
  shiny: "Shiny token",
};

const CATEGORY_ICONS: Record<string, string> = {
  catch: "🎣", website: "🌐", social: "🤝", type: "💎",
  streak: "🔥", pokedex: "📖", shiny: "✨", customization: "🎨",
  level: "⭐", legendary: "🌟",
};

interface Props {
  def: AchievementDef;
  unlock: AchievementUnlock | null;
  progress?: number; // 0–100
  onClaim: (achievementId: string) => Promise<void>;
}

export default function AchievementCard({ def, unlock, progress = 0, onClaim }: Props) {
  const [claiming, setClaiming] = useState(false);

  const isEarned = unlock !== null;
  const isClaimed = isEarned && unlock!.claimed_at !== null;
  const isUnclaimedEarned = isEarned && !isClaimed;

  const hasReward = def.storageReward > 0 || def.tokenReward !== null;
  const rewardLabel = [
    def.storageReward > 0 ? `+${def.storageReward} storage` : null,
    def.tokenReward ? TOKEN_LABELS[def.tokenReward] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  async function handleClaim() {
    setClaiming(true);
    try {
      await onClaim(def.id);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border-2 transition-all",
        isClaimed
          ? "border-pb-grass bg-pb-leaf/60 opacity-70"
          : isUnclaimedEarned
          ? "border-pb-pine bg-pb-leaf shadow-[2px_2px_0_black]"
          : "border-black/20 bg-white/50"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "text-2xl w-10 h-10 flex items-center justify-center rounded-lg border-2 shrink-0",
          isEarned ? "border-pb-pine bg-pb-grass/40" : "border-black/20 bg-white/30 grayscale opacity-50"
        )}
      >
        {ACHIEVEMENT_SPRITES[def.id] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ACHIEVEMENT_SPRITES[def.id].src}
            alt={def.label}
            className="w-6 h-6 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          CATEGORY_ICONS[def.category] ?? "🏆"
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "font-black text-sm uppercase tracking-wide",
              isEarned ? "text-pb-forest" : "text-black/40"
            )}
          >
            {def.label}
          </span>
          {isClaimed && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-pb-pine bg-pb-grass/30 px-1.5 py-0.5 rounded">
              ✓ Claimed
            </span>
          )}
        </div>
        <p className={cn("text-xs mt-0.5", isEarned ? "text-black/70" : "text-black/40")}>
          {def.description}
        </p>

        {/* Reward label */}
        {hasReward && (
          <p
            className={cn(
              "text-[10px] font-bold mt-1",
              isEarned ? "text-pb-pine" : "text-black/30"
            )}
          >
            🎁 {rewardLabel}
          </p>
        )}

        {/* Progress bar — shown when not yet earned */}
        {!isEarned && def.threshold > 1 && progress > 0 && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
              <div
                className="h-full bg-pb-pine rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-black/40 mt-0.5 block">
              {Math.round(progress)}% complete
            </span>
          </div>
        )}

        {/* Unlocked-at date for claimed */}
        {isClaimed && unlock?.unlocked_at && (
          <p className="text-[10px] text-black/40 mt-1">
            Unlocked {new Date(unlock.unlocked_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Claim button */}
      {isUnclaimedEarned && (
        <Button
          variant="game"
          tone="primary"
          size="sm"
          onClick={handleClaim}
          disabled={claiming}
          className="shrink-0 self-center"
        >
          {claiming ? "..." : "Claim"}
        </Button>
      )}
    </div>
  );
}
