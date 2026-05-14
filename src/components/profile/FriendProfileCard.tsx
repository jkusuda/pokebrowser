"use client";

import { useEffect, useState } from "react";
import { FriendProfile, Pokemon } from "@/types";
import { TRAINER_BASE, getPokemonSprite, getBuddySpriteSize, getPokemonData } from "@/lib/pokemon";
import { Card } from "@/components/ui/card";

const BackArrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3L5 8L10 13" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type BuddyData = Pick<Pokemon, "id" | "pokedex_number" | "is_shiny" | "nickname"> | null;

type Props = {
  profile: FriendProfile;
  onBack: () => void;
};

function Shimmer({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`bg-[#48bb78]/40 animate-pulse rounded-lg ${className}`} style={style} />
  );
}

export default function FriendProfileCard({ profile, onBack }: Props) {
  const [fullProfile, setFullProfile] = useState<FriendProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFullProfile(null);

    fetch(`/api/friends/profile/${profile.friend_code}`)
      .then((r) => r.json())
      .then((data: FriendProfile) => {
        if (!cancelled) {
          setFullProfile(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [profile.friend_code]);

  const level = fullProfile?.level ?? 1;
  const xpProgress = fullProfile
    ? Math.min(100, Math.max(0, (fullProfile.xp / (level * 1000)) * 100))
    : 0;

  return (
    <Card variant="game" tone="grass" className="relative h-full p-4 gap-0">

      {/* Back button — always available */}
      <button
        onClick={onBack}
        className="absolute top-3 left-3 z-30 w-8 h-8 rounded-[6px] bg-[#e0f4d9] border-[3px] border-black flex items-center justify-center shadow-[2px_2px_0_black] hover:translate-y-px active:shadow-none transition-all cursor-pointer"
        title="Back"
      >
        <BackArrow />
      </button>

      {/* Title */}
      <div className="flex justify-center mb-3 px-10 h-7 items-center">
        {loading ? (
          <Shimmer className="h-5 w-36 rounded-md" />
        ) : (
          <h1
            className="font-black tracking-widest text-xl text-white uppercase text-center truncate"
            style={{ WebkitTextStroke: "1.5px black", textShadow: "0 2px 0 black" }}
          >
            {fullProfile?.trainer_name}
          </h1>
        )}
      </div>

      {/* Inner card */}
      <div className="flex-1 bg-[#e0f4d9] rounded-[8px] border-4 border-black relative flex flex-col shadow-inner overflow-hidden">

        {/* Sprites — both bottom-aligned; trainer centres when no buddy, shifts right when buddy present */}
        <div className="flex-1 relative overflow-hidden">
          {loading ? (
            <>
              <Shimmer className="absolute rounded-2xl" style={{ width: 96, height: 96, left: 8, bottom: 64 }} />
              <Shimmer className="absolute rounded-2xl" style={{ width: 160, height: 220, left: "50%", transform: "translateX(-50%)", bottom: 64 }} />
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
              <Shimmer className="w-8 h-8 rounded" />
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
              <Shimmer className="w-full h-4 rounded-full" />
            ) : (
              <>
                <div className="flex justify-between items-end mb-1">
                  <span className="font-black tracking-widest text-[10px] text-black leading-none uppercase">EXP</span>
                  <span className="font-black tracking-widest text-[10px] text-black leading-none">
                    {fullProfile?.xp} / {level * 1000}
                  </span>
                </div>
                <div className="w-full h-4 bg-white border-[3px] border-black rounded-full overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                  <div
                    className="h-full bg-[#48bb78] transition-all duration-500"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
