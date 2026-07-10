"use client";

import { useState } from "react";
import EditProfileModal from "./EditProfileModal";
import { User, Pokemon } from "@/types";
import { TRAINER_BASE, getPokemonSprite, getBuddySpriteSize, getPokemonData, getLevelProgress } from "@/lib/pokemon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  user: User;
  favoritePokemon: Pokemon | null;
};

export default function TrainerCard({ user, favoritePokemon }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const { level, current: xpInLevel, required: xpRequired } = getLevelProgress(user.xp ?? 0);

  const buddyData = favoritePokemon ? getPokemonData(favoritePokemon.pokedex_number) : null;
  const buddySize = buddyData ? getBuddySpriteSize(buddyData.height) : 96;

  return (
    <>
      <Card variant="game" tone="grass" className="relative h-full p-4 gap-0">

        {/* Title */}
        <div className="flex justify-center mb-3 px-2">
          <h1 className="text-emboss text-xl text-center">{user.trainer_name}</h1>
        </div>

        {/* Inner card */}
        <div className="flex-1 bg-pb-bg rounded-[8px] border-4 border-black relative flex flex-col shadow-inner overflow-hidden">

          {/* Sprites — both bottom-aligned; trainer centres when no buddy, shifts right when buddy present */}
          <div className="flex-1 relative overflow-hidden">
            {favoritePokemon && (
              <img
                src={getPokemonSprite(favoritePokemon.pokedex_number, favoritePokemon.is_shiny)}
                alt={favoritePokemon.nickname ?? `#${favoritePokemon.pokedex_number}`}
                className="absolute z-10"
                style={{
                  imageRendering: "pixelated",
                  height: buddySize,
                  width: "auto",
                  left: 8,
                  bottom: 64,
                }}
              />
            )}
            <img
              src={`${TRAINER_BASE}/${user.avatar_id}.png`}
              alt={`Avatar ${user.avatar_id}`}
              className="absolute object-contain z-20 pointer-events-none"
              style={{
                imageRendering: "pixelated",
                width: "18rem",
                height: "18rem",
                bottom: 64,
                ...(favoritePokemon
                  ? { right: 8 }
                  : { left: "50%", transform: "translateX(-50%)" }),
              }}
            />
          </div>

          {/* Bottom bar — level badge + edit button */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 z-30 pointer-events-none">
            <div className={`flex flex-col items-center justify-center w-14 h-14 bg-white rounded-[8px] border-4 border-black shadow-[2px_2px_0_black] shrink-0 pointer-events-auto`}>
              <span className="font-bold text-[9px] text-black leading-none mt-1">LEVEL</span>
              <span className="font-black text-xl text-black leading-none mt-0.5">{level}</span>
            </div>

            <div className="flex flex-col justify-center px-1 h-14 flex-1 pointer-events-auto mt-1">
              <div className="flex justify-between items-end mb-1">
                <span className="font-black tracking-widest text-[10px] text-black leading-none uppercase">EXP</span>
                <span className="font-black tracking-widest text-[10px] text-black leading-none">{xpInLevel} / {xpRequired}</span>
              </div>
              <div className="w-full h-4 bg-white border-[3px] border-black rounded-full overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                <div
                  className="h-full bg-pb-pine"
                  style={{ width: `${Math.min(100, Math.max(0, (xpInLevel / xpRequired) * 100))}%` }}
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
          currentName={user.trainer_name}
          currentAvatarId={user.avatar_id}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
}
