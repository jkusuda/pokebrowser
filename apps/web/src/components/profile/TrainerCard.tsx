"use client";

import { useState } from "react";
import EditProfileModal from "./EditProfileModal";
import BadgeStrip from "./BadgeStrip";
import BuddyIndicator from "./BuddyIndicator";
import BuddySpriteArea from "./BuddySpriteArea";
import type { Pokemon, Profile } from "api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { xpBar } from "@/lib/utils";

const NotePenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="2" width="14" height="18" rx="2" fill="white" stroke="black" strokeWidth="2" strokeLinejoin="round" />
    <path d="M7 7H13M7 11H13M7 15H9" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 14L17 9L20 12L15 17L12 14Z" fill="#F59E0B" stroke="black" strokeWidth="2" strokeLinejoin="round" />
    <path d="M17 9L19 7L22 10L20 12L17 9Z" fill="#EF4444" stroke="black" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 14L15 17L9 20L12 14Z" fill="#FDE68A" stroke="black" strokeWidth="2" strokeLinejoin="round" />
    <path d="M10 18L13 18L9 20Z" fill="#1F2937" />
  </svg>
);

type Props = {
  profile: Profile;
  buddy: Pokemon | null;
  unlockedAchievementIds: string[];
};

export default function TrainerCard({ profile, buddy, unlockedAchievementIds }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const xp = xpBar(profile);

  return (
    <>
      <Card variant="game" tone="grass" className="relative h-full p-4 gap-0">

        {/* Title */}
        <div className="flex justify-center mb-3 px-2">
          <h1 className="text-emboss text-xl text-center">{profile.trainerName}</h1>
        </div>

        {/* Inner card */}
        <div className="flex-1 bg-pb-bg rounded-[8px] border-4 border-black relative flex flex-col shadow-inner overflow-hidden">

          <BadgeStrip badgeIds={profile.displayedBadges} />

          {buddy && (
            <BuddyIndicator
              pokedexNumber={buddy.pokedexNumber}
              nickname={buddy.nickname}
            />
          )}

          <BuddySpriteArea
            avatarId={profile.avatarId}
            avatarAlt={`Avatar ${profile.avatarId}`}
            buddy={
              buddy
                ? {
                    pokedexNumber: buddy.pokedexNumber,
                    isShiny: buddy.isShiny,
                    nickname: buddy.nickname,
                  }
                : null
            }
          />

          {/* Bottom bar — level badge + edit button */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 z-30 pointer-events-none">
            <div className={`flex flex-col items-center justify-center w-14 h-14 bg-white rounded-[8px] border-4 border-black shadow-[2px_2px_0_black] shrink-0 pointer-events-auto`}>
              <span className="font-bold text-[0.5625rem] text-black leading-none mt-1">LEVEL</span>
              <span className="font-black text-xl text-black leading-none mt-0.5">{profile.level}</span>
            </div>

            <div className="flex flex-col justify-center px-1 h-14 flex-1 pointer-events-auto mt-1">
              <div className="flex justify-between items-end mb-1">
                <span className="font-black tracking-widest text-[0.625rem] text-black leading-none uppercase">EXP</span>
                <span className="font-black tracking-widest text-[0.625rem] text-black leading-none">{xp.current} / {xp.required}</span>
              </div>
              <div className="w-full h-4 bg-white border-[3px] border-black rounded-full overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                <div
                  className="h-full bg-pb-primary"
                  style={{ width: `${xp.percent}%` }}
                />
              </div>
            </div>

            <Button
              onClick={() => setEditOpen(true)}
              variant="game"
              tone="neutral"
              size="icon"
              className="shrink-0 mb-1 w-10 h-10 border-[3px] shadow-[2px_2px_0_black] pointer-events-auto [&_svg]:size-6"
              title="Edit Profile"
            >
              <NotePenIcon />
            </Button>
          </div>
        </div>
      </Card>

      {editOpen && (
        <EditProfileModal
          currentName={profile.trainerName}
          currentAvatarId={profile.avatarId}
          currentBadgeIds={profile.displayedBadges}
          unlockedAchievementIds={unlockedAchievementIds}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
}
