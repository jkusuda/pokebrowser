"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AchievementDef } from "@/lib/achievements-data";
import type { Achievement } from "api-client";
import { cn } from "@/lib/utils";
import { StaticImageData } from "next/image";
import { TOKEN_TYPE_LABELS } from "@/lib/events-data";

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
  kanto_complete:       pokeRadarImg,
  johto_complete:       pokeRadarImg,
  hoenn_complete:       pokeRadarImg,
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
  team_player:          friendImg,
  event_champion:       ribbonImg,
};

const CATEGORY_ICONS: Record<string, string> = {
  catch: "🎣", website: "🌐", social: "🤝", type: "💎",
  streak: "🔥", pokedex: "📖", shiny: "✨", customization: "🎨",
  level: "⭐", legendary: "🌟",
};

interface Props {
  def: AchievementDef;
  achievement?: Achievement;
  onClaim: (achievementId: string) => Promise<void>;
}

export default function AchievementCard({ def, achievement, onClaim }: Props) {
  const [claiming, setClaiming] = useState(false);

  const isEarned = !!achievement?.unlockedAt;
  const isClaimed = isEarned && achievement?.claimedAt != null;
  const isUnclaimedEarned = isEarned && !isClaimed;

  const reward = achievement?.reward;
  const rewardLabel = [
    reward && reward.xp > 0 ? `+${reward.xp.toLocaleString()} XP` : null,
    reward && reward.storage > 0 ? `+${reward.storage} storage` : null,
    reward?.token ? TOKEN_TYPE_LABELS[reward.token] : null,
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
          ? "border-pb-accent bg-pb-surface/60 opacity-70"
          : isUnclaimedEarned
          ? "border-pb-primary bg-pb-surface shadow-[2px_2px_0_black]"
          : "border-black/20 bg-white/50"
      )}
    >
      <div
        className={cn(
          "text-2xl w-10 h-10 flex items-center justify-center rounded-lg border-2 shrink-0",
          isEarned ? "border-pb-primary bg-pb-accent/40" : "border-black/20 bg-white/30 grayscale opacity-50"
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

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "font-black text-sm uppercase tracking-wide",
              isEarned ? "text-pb-ink" : "text-black/40"
            )}
          >
            {def.label}
          </span>
          {isClaimed && (
            <span className="text-[0.625rem] font-bold uppercase tracking-widest text-pb-primary bg-pb-accent/30 px-1.5 py-0.5 rounded">
              ✓ Claimed
            </span>
          )}
        </div>
        <p className={cn("text-xs mt-0.5", isEarned ? "text-black/70" : "text-black/40")}>
          {def.description}
        </p>

        {rewardLabel && (
          <p
            className={cn(
              "text-[0.625rem] font-bold mt-1",
              isEarned ? "text-pb-primary" : "text-black/30"
            )}
          >
            🎁 {rewardLabel}
          </p>
        )}

        {!isEarned && achievement && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
              <div
                className="h-full bg-pb-primary rounded-full transition-all"
                style={{ width: `${(achievement.progress / achievement.goal) * 100}%` }}
              />
            </div>
            <span className="text-[0.625rem] text-black/40 mt-0.5 block">
              {achievement.progress.toLocaleString()} / {achievement.goal.toLocaleString()}
            </span>
          </div>
        )}

        {isClaimed && achievement?.unlockedAt && (
          <p className="text-[0.625rem] text-black/40 mt-1">
            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>

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
