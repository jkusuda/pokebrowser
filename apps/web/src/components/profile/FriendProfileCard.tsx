"use client";

import { useEffect, useState } from "react";
import BadgeStrip from "./BadgeStrip";
import BuddyIndicator from "./BuddyIndicator";
import BuddySpriteArea from "./BuddySpriteArea";
import type { FriendProfile } from "api-client";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { xpBar } from "@/lib/utils";
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
  const requestKey = `${profile.friendCode}:${retryToken}`;

  useEffect(() => {
    let cancelled = false;

    api.trainer(profile.friendCode)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, profile: data, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, profile: null, failed: true });
      });

    return () => { cancelled = true; };
  }, [requestKey, profile.friendCode]);

  const settled = result?.key === requestKey ? result : null;
  const loading = settled === null;
  const failed = settled?.failed ?? false;
  const fullProfile = settled?.profile ?? null;

  const xp = fullProfile ? xpBar(fullProfile) : { current: 0, required: 0, percent: 0 };

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
          <Shimmer className="bg-pb-primary/40 h-5 w-36 rounded-md" />
        ) : (
          <h1 className="text-emboss text-xl text-center truncate">
            {fullProfile?.trainerName ?? profile.trainerName}
          </h1>
        )}
      </div>

      {/* Inner card */}
      <div className="flex-1 bg-pb-bg rounded-[8px] border-4 border-black relative flex flex-col shadow-inner overflow-hidden">

        {failed ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
            <span className="font-black tracking-widest uppercase text-[0.6875rem] text-pb-ink text-center">
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
        {!loading && <BadgeStrip badgeIds={fullProfile?.displayedBadges ?? []} />}

        {!loading && fullProfile?.buddy && (
          <BuddyIndicator
            pokedexNumber={fullProfile.buddy.pokedexNumber}
            nickname={fullProfile.buddy.nickname}
          />
        )}

        {/* Sprites — both bottom-aligned; trainer centres when no buddy, shifts right when buddy present */}
        {loading ? (
          <div className="flex-1 relative overflow-hidden">
            <Shimmer className="bg-pb-primary/40 absolute rounded-2xl" style={{ width: 96, height: 96, left: 8, bottom: 64 }} />
            <Shimmer className="bg-pb-primary/40 absolute rounded-2xl" style={{ width: 160, height: 220, left: "50%", transform: "translateX(-50%)", bottom: 64 }} />
          </div>
        ) : (
          <BuddySpriteArea
            avatarId={fullProfile?.avatarId ?? profile.avatarId}
            avatarAlt={`${fullProfile?.trainerName ?? profile.trainerName}'s avatar`}
            buddy={
              fullProfile?.buddy
                ? {
                    pokedexNumber: fullProfile.buddy.pokedexNumber,
                    isShiny: fullProfile.buddy.isShiny,
                    nickname: fullProfile.buddy.nickname,
                  }
                : null
            }
          />
        )}

        {/* Bottom bar — level + XP */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 z-30 pointer-events-none">
          {/* Level badge */}
          <div className="flex flex-col items-center justify-center w-14 h-14 bg-white rounded-[8px] border-4 border-black shadow-[2px_2px_0_black] shrink-0">
            {loading ? (
              <Shimmer className="bg-pb-primary/40 w-8 h-8 rounded" />
            ) : (
              <>
                <span className="font-bold text-[0.5625rem] text-black leading-none mt-1">LEVEL</span>
                <span className="font-black text-xl text-black leading-none mt-0.5">{fullProfile?.level ?? "–"}</span>
              </>
            )}
          </div>

          {/* XP bar */}
          <div className="flex flex-col justify-center px-1 h-14 flex-1 mt-1">
            {loading ? (
              <Shimmer className="bg-pb-primary/40 w-full h-4 rounded-full" />
            ) : (
              <>
                <div className="flex justify-between items-end mb-1">
                  <span className="font-black tracking-widest text-[0.625rem] text-black leading-none uppercase">EXP</span>
                  <span className="font-black tracking-widest text-[0.625rem] text-black leading-none">
                    {xp.current} / {xp.required}
                  </span>
                </div>
                <div className="w-full h-4 bg-white border-[3px] border-black rounded-full overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                  <div
                    className="h-full bg-pb-primary transition-all duration-500"
                    style={{ width: `${xp.percent}%` }}
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
