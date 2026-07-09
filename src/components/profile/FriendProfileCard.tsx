"use client";

import { useEffect, useState } from "react";
import { FriendProfile } from "@/types";
import { TRAINER_BASE, getPokemonSprite, getBuddySpriteSize, getPokemonData, getLevelProgress } from "@/lib/pokemon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shimmer } from "@/components/ui/shimmer";

const BackArrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3L5 8L10 13" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Props = {
  profile: FriendProfile;
  onBack: () => void;
};

export default function FriendProfileCard({ profile, onBack }: Props) {
  // The fetch result is tagged with the request key it answered; loading and
  // failed states are derived from whether the latest key has settled, so the
  // effect never needs to reset state synchronously.
  const [result, setResult] = useState<{
    key: string;
    profile: FriendProfile | null;
    failed: boolean;
  } | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const requestKey = `${profile.friend_code}:${retryToken}`;

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/friends/profile/${profile.friend_code}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: FriendProfile) => {
        if (!cancelled) setResult({ key: requestKey, profile: data, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, profile: null, failed: true });
      });

    return () => { cancelled = true; };
  }, [requestKey, profile.friend_code]);

  const settled = result?.key === requestKey ? result : null;
  const loading = settled === null;
  const failed = settled?.failed ?? false;
  const fullProfile = settled?.profile ?? null;

  const { level, current: xpInLevel, required: xpRequired } = getLevelProgress(fullProfile?.xp ?? 0);
  const xpProgress = fullProfile
    ? Math.min(100, Math.max(0, (xpInLevel / xpRequired) * 100))
    : 0;

  return (
    <Card variant="game" tone="grass" className="relative h-full p-4 gap-0">

      {/* Back button — always available */}
      <Button
        onClick={onBack}
        variant="game"
        tone="neutral"
        size="icon"
        className="absolute top-3 left-3 z-30 w-8 h-8 rounded-[6px] border-[3px] shadow-[2px_2px_0_black]"
        title="Back"
      >
        <BackArrow />
      </Button>

      {/* Title */}
      <div className="flex justify-center mb-3 px-10 h-7 items-center">
        {loading ? (
          <Shimmer className="bg-pb-pine/40 h-5 w-36 rounded-md" />
        ) : (
          <h1 className="text-emboss text-xl text-center truncate">
            {fullProfile?.trainer_name ?? profile.trainer_name}
          </h1>
        )}
      </div>

      {/* Inner card */}
      <div className="flex-1 bg-pb-bg rounded-[8px] border-4 border-black relative flex flex-col shadow-inner overflow-hidden">

        {failed ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
            <span className="font-black tracking-widest uppercase text-[11px] text-pb-forest text-center">
              Couldn&apos;t load this trainer&apos;s profile
            </span>
            <Button
              variant="game"
              tone="neutral"
              size="sm"
              onClick={() => setRetryToken((n) => n + 1)}
            >
              Retry
            </Button>
          </div>
        ) : (
        <>
        {/* Sprites — both bottom-aligned; trainer centres when no buddy, shifts right when buddy present */}
        <div className="flex-1 relative overflow-hidden">
          {loading ? (
            <>
              <Shimmer className="bg-pb-pine/40 absolute rounded-2xl" style={{ width: 96, height: 96, left: 8, bottom: 64 }} />
              <Shimmer className="bg-pb-pine/40 absolute rounded-2xl" style={{ width: 160, height: 220, left: "50%", transform: "translateX(-50%)", bottom: 64 }} />
            </>
          ) : (
            <>
              {fullProfile?.buddy && (() => {
                const bd = getPokemonData(fullProfile.buddy!.pokedex_number);
                const sz = bd ? getBuddySpriteSize(bd.height) : 96;
                return (
                  <img
                    src={getPokemonSprite(fullProfile.buddy!.pokedex_number)}
                    alt={fullProfile.buddy!.nickname ?? `#${fullProfile.buddy!.pokedex_number}`}
                    className="absolute z-10"
                    style={{ imageRendering: "pixelated", height: sz, width: "auto", left: 8, bottom: 64 }}
                  />
                );
              })()}
              <img
                src={`${TRAINER_BASE}/${fullProfile?.avatar_id ?? profile.avatar_id}.png`}
                alt={`${fullProfile?.trainer_name ?? profile.trainer_name}'s avatar`}
                className="absolute object-contain z-20 pointer-events-none"
                style={{
                  imageRendering: "pixelated",
                  width: "18rem",
                  height: "18rem",
                  bottom: 64,
                  ...(fullProfile?.buddy
                    ? { right: 8 }
                    : { left: "50%", transform: "translateX(-50%)" }),
                }}
              />
            </>
          )}
        </div>

        {/* Bottom bar — level + XP */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 z-30 pointer-events-none">
          {/* Level badge */}
          <div className="flex flex-col items-center justify-center w-14 h-14 bg-white rounded-[8px] border-4 border-black shadow-[2px_2px_0_black] shrink-0">
            {loading ? (
              <Shimmer className="bg-pb-pine/40 w-8 h-8 rounded" />
            ) : (
              <>
                <span className="font-bold text-[9px] text-black leading-none mt-1">LEVEL</span>
                <span className="font-black text-xl text-black leading-none mt-0.5">{level}</span>
              </>
            )}
          </div>

          {/* XP bar */}
          <div className="flex flex-col justify-center px-1 h-14 flex-1 mt-1">
            {loading ? (
              <Shimmer className="bg-pb-pine/40 w-full h-4 rounded-full" />
            ) : (
              <>
                <div className="flex justify-between items-end mb-1">
                  <span className="font-black tracking-widest text-[10px] text-black leading-none uppercase">EXP</span>
                  <span className="font-black tracking-widest text-[10px] text-black leading-none">
                    {xpInLevel} / {xpRequired}
                  </span>
                </div>
                <div className="w-full h-4 bg-white border-[3px] border-black rounded-full overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                  <div
                    className="h-full bg-pb-pine transition-all duration-500"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        </>
        )}
      </div>
    </Card>
  );
}
