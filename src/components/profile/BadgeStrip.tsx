"use client";

import { StaticImageData } from "next/image";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements-data";
import { MAX_DISPLAYED_BADGES } from "@/lib/badges-data";
import { cn } from "@/lib/utils";

import level10Img from "@/assets/badges/level10_badge.png";
import level20Img from "@/assets/badges/level20_badge.png";
import level30Img from "@/assets/badges/level30_badge.png";
import level40Img from "@/assets/badges/level40_badge.png";
import level50Img from "@/assets/badges/level50_badge.png";
import shinyImg from "@/assets/badges/shiny_badge.png";
import legendaryImg from "@/assets/badges/legendary_badge.png";
import masterCollectorImg from "@/assets/badges/master_collector_badge.png";
import pokedexImg from "@/assets/badges/pokedex_badge.png";
import worldwideImg from "@/assets/badges/worldwide_badge.png";
import thirtyDayImg from "@/assets/badges/thirty_day_badge.png";
import friendsImg from "@/assets/badges/friends_badge.png";

// Single sprite-import site for badges, keyed by achievement id — same rule as
// ACHIEVEMENT_SPRITES in AchievementCard.tsx (badges-data.ts must stay
// image-import-free for server code).
export const BADGE_SPRITES: Record<string, StaticImageData> = {
  level_10: level10Img,
  level_20: level20Img,
  level_30: level30Img,
  level_40: level40Img,
  level_50: level50Img,
  lucky_color: shinyImg,
  legendary_encounter: legendaryImg,
  master_collector: masterCollectorImg,
  gotta_catch_em_all: pokedexImg,
  netizen: worldwideImg,
  love_of_the_game: thirtyDayImg,
  social_butterfly: friendsImg,
};

/** Chunky hover label; parent must be `relative group`. Position via className. */
export function BadgeTooltip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute z-40 hidden group-hover:block whitespace-nowrap rounded-[6px] border-2 border-black bg-white px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-black shadow-[2px_2px_0_black]",
        className
      )}
    >
      {label}
    </span>
  );
}

type BadgeIconsProps = {
  badgeIds: string[];
  className?: string;
  /** Sprite size, e.g. "w-9 h-9" (trainer card) or "w-7 h-7" (leaderboard rows). */
  badgeClassName?: string;
  /** Tooltip position relative to each badge. */
  tooltipClassName?: string;
};

/**
 * A hover-tooltipped row of up to 3 displayed badges. Unknown ids (stale rows,
 * remapped badges) render nothing.
 */
export function BadgeIcons({
  badgeIds,
  className,
  badgeClassName = "w-9 h-9",
  tooltipClassName = "top-full right-0 mt-1",
}: BadgeIconsProps) {
  const badges = badgeIds.filter((id) => BADGE_SPRITES[id]).slice(0, MAX_DISPLAYED_BADGES);
  if (badges.length === 0) return null;

  return (
    <div className={cn("flex gap-1.5", className)}>
      {badges.map((id) => (
        <div key={id} className="relative group shrink-0">
          <img
            src={BADGE_SPRITES[id].src}
            alt={ACHIEVEMENT_BY_ID[id]?.label ?? id}
            className={cn("object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)]", badgeClassName)}
            style={{ imageRendering: "pixelated" }}
          />
          <BadgeTooltip label={ACHIEVEMENT_BY_ID[id]?.label ?? id} className={tooltipClassName} />
        </div>
      ))}
    </div>
  );
}

/**
 * The displayed badges in the top-right of a trainer card's inner section.
 * Tooltips are right-anchored so they never escape the card's overflow-hidden.
 */
export default function BadgeStrip({ badgeIds }: { badgeIds: string[] }) {
  return <BadgeIcons badgeIds={badgeIds} className="absolute top-3 right-3 z-30" />;
}
