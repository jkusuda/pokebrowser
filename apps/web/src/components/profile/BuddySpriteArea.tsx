"use client";

import { TRAINER_BASE, getPokemonSprite, getBuddySpriteLayout } from "@/lib/pokemon";
import type { BuddyOverride } from "@/lib/buddy-overrides";

const rem = (px: number) => `${px / 16}rem`;

type Props = {
  avatarId: string;
  avatarAlt: string;
  buddy: { pokedexNumber: number; isShiny: boolean; nickname: string | null } | null;
  /**
   * Dev tuner only — render a candidate override instead of the committed one
   * from `BUDDY_OVERRIDES`. Production callers leave this undefined.
   */
  overrideDraft?: BuddyOverride;
};

/**
 * A trainer card's sprite area: both sprites bottom-aligned, buddy on the left,
 * trainer avatar shifted right when a buddy is present and centred when it isn't.
 *
 * Shared by TrainerCard, FriendProfileCard and the /dev/buddy tuner so the buddy's
 * geometry can't drift between where you tune it and where it ships.
 */
export default function BuddySpriteArea({
  avatarId,
  avatarAlt,
  buddy,
  overrideDraft,
}: Props) {
  const layout = buddy ? getBuddySpriteLayout(buddy.pokedexNumber, overrideDraft) : null;

  return (
    <div className="flex-1 relative overflow-hidden">
      {buddy && layout && (
        <img
          src={getPokemonSprite(buddy.pokedexNumber, buddy.isShiny)}
          alt={buddy.nickname ?? `#${buddy.pokedexNumber}`}
          className="absolute z-10"
          style={{
            imageRendering: "pixelated",
            height: rem(layout.height),
            width: "auto",
            left: rem(layout.left),
            bottom: rem(layout.bottom),
          }}
        />
      )}
      <img
        src={`${TRAINER_BASE}/${avatarId}.png`}
        alt={avatarAlt}
        className="absolute object-contain z-20 pointer-events-none"
        style={{
          imageRendering: "pixelated",
          width: "18rem",
          height: "18rem",
          bottom: rem(64),
          ...(buddy ? { right: rem(8) } : { left: "50%", transform: "translateX(-50%)" }),
        }}
      />
    </div>
  );
}
