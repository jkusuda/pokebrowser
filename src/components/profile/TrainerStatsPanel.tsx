"use client";

import { Card } from "@/components/ui/card";
import { UserStats } from "@/types";

type Props = {
  userStats: UserStats | null;
  pokedexCount: number;
  friendCount: number;
};

interface StatDef {
  label: string;
  value: (p: Props) => string | number;
  sub?: (p: Props) => string | null;
}

const STAT_DEFS: StatDef[] = [
  {
    label: "Current Streak",
    value: ({ userStats }) => `${userStats?.current_streak ?? 0}d`,
    sub: ({ userStats }) =>
      userStats?.longest_streak ? `Best: ${userStats.longest_streak}d` : null,
  },
  {
    label: "Pokédex",
    value: ({ pokedexCount }) => `${pokedexCount} / 151`,
  },
  {
    label: "Types Caught",
    value: ({ userStats }) => `${userStats?.types_caught?.length ?? 0} / 17`,
  },
  {
    label: "Friends",
    value: ({ friendCount }) => friendCount,
  },
];

export default function TrainerStatsPanel({ userStats, pokedexCount, friendCount }: Props) {
  const props = { userStats, pokedexCount, friendCount };

  return (
    <Card variant="game" tone="grass" className="p-4 w-full mt-4 gap-0">
      <h2 className="font-bold text-black text-sm mb-3 tracking-wide">STATS</h2>

      <div className="grid grid-cols-2 gap-2">
        {STAT_DEFS.map(({ label, value, sub }) => {
          const subText = sub?.(props);
          return (
            <div
              key={label}
              className="bg-pb-bg rounded-lg border-2 border-black px-3 py-2 shadow-[1px_1px_0_black]"
            >
              <p className="text-black font-black text-sm leading-tight">{value(props)}</p>
              <p className="text-black/60 text-[10px] font-bold leading-tight">{label}</p>
              {subText && (
                <p className="text-pb-pine text-[10px] font-bold leading-tight">{subText}</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
