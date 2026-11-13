"use client";

import { useState } from "react";
import { Shimmer } from "@/components/ui/shimmer";
import { BadgeIcons } from "@/components/profile/BadgeStrip";
import { cn } from "@/lib/utils";
import { TRAINER_BASE } from "@/lib/pokemon";
import type { LeaderboardEntry } from "api-client";

/** Gold / silver / bronze tints for the top 3 ranks; muted otherwise. */
function rankBadgeClass(rank: number): string {
  if (rank === 1) return "bg-yellow-300 text-black border-black";
  if (rank === 2) return "bg-gray-200 text-black border-black";
  if (rank === 3) return "bg-orange-300 text-black border-black";
  return "bg-pb-bg text-pb-ink border-black/30";
}

export function ShimmerRow() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-black/10">
      <Shimmer className="w-9 h-9 rounded-lg shrink-0" />
      <Shimmer className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Shimmer className="h-3 w-28" />
        <Shimmer className="h-2 w-20" />
      </div>
      <Shimmer className="h-4 w-10" />
    </div>
  );
}

export function LeaderboardRow({ entry, unit }: { entry: LeaderboardEntry; unit: string }) {
  const [copied, setCopied] = useState(false);
  const masked = entry.trainerName === null;
  const canCopy = !masked && !entry.isMe && !!entry.friendCode;

  const handleCopy = async () => {
    if (!canCopy || !entry.friendCode) return;
    await navigator.clipboard.writeText(entry.friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={canCopy ? handleCopy : undefined}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border-2 transition-colors",
        entry.isMe
          ? "bg-pb-accent/60 border-pb-primary"
          : "bg-white border-black/15",
        canCopy && "cursor-pointer hover:border-pb-primary/60"
      )}
      title={canCopy ? "Click to copy friend code" : undefined}
    >
      {/* Rank badge */}
      <div
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg border-2 shrink-0 font-black text-sm shadow-[2px_2px_0_rgba(0,0,0,0.25)]",
          rankBadgeClass(entry.rank)
        )}
      >
        {entry.rank}
      </div>

      {/* Avatar */}
      {masked ? (
        <div className="w-10 h-10 rounded-lg bg-pb-primary/15 border-2 border-black/10 flex items-center justify-center shrink-0 text-pb-ink/50 font-black text-lg">
          ?
        </div>
      ) : (
        <img
          src={`${TRAINER_BASE}/${entry.avatarId}.png`}
          alt={entry.trainerName ?? "Trainer"}
          className="w-10 h-10 object-contain shrink-0"
          style={{ imageRendering: "pixelated" }}
        />
      )}

      {/* Name + friend code */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-bold text-sm text-pb-ink truncate min-w-0">
            {masked ? "Anonymous Trainer" : entry.trainerName}
            {entry.isMe && <span className="ml-1.5 text-pb-primary font-black text-[9px] tracking-widest uppercase">YOU</span>}
          </p>
          {!masked && (
            <BadgeIcons
              badgeIds={entry.displayedBadges ?? []}
              className="gap-1"
              badgeClassName="w-7 h-7"
              tooltipClassName="top-full left-1/2 -translate-x-1/2 mt-1"
            />
          )}
        </div>
        {masked ? (
          <p className="font-black tracking-widest uppercase text-[7px] text-pb-ink/40 mt-0.5">PRIVATE</p>
        ) : (
          <p className="font-mono tracking-widest text-[9px] text-pb-primary/80 mt-0.5">
            {copied ? "COPIED!" : entry.friendCode}
          </p>
        )}
      </div>

      {/* Stat value */}
      <div className="flex flex-col items-end shrink-0">
        <span className="font-black text-base text-pb-ink leading-none">{entry.value}</span>
        <span className="font-black tracking-widest uppercase text-[7px] text-pb-ink/50 mt-0.5">{unit}</span>
      </div>
    </div>
  );
}
