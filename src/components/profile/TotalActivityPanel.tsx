"use client";

import { Card } from "@/components/ui/card";

export type ActivityStats = {
  pokemonCaught: number;   // lifetime catches from user_stats (falls back to box count)
  websitesVisited: number; // unique sites from user_stats
  adventureStarted: string; // pre-formatted date string
};

type Props = { stats: ActivityStats };

// Pokéball icon
const PokeballIcon = () => (
  <div className={`w-6 h-6 rounded-full bg-red-500 border-[3px] border-black overflow-hidden flex flex-col relative`}>
    <div className="h-1/2 w-full bg-white absolute top-0" />
    <div className="w-full h-[3px] bg-black absolute top-1/2 -mt-px" />
    <div className={`w-2 h-2 rounded-full bg-white border-2 border-black absolute top-1/2 left-1/2 -mt-[4px] -ml-[4px] z-10`} />
  </div>
);

// Globe / browser icon
const GlobeIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" width="24" height="24" stroke="#42b5c5" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" strokeLinecap="round" />
  </svg>
);

// Calendar / flag icon for adventure start
const AdventureIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" width="24" height="24" stroke="#e67e22" strokeWidth="2">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
    <path d="M8 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const STAT_DEFS = [
  { key: "pokemonCaught", label: "Pokémon Caught", Icon: PokeballIcon },
  { key: "websitesVisited", label: "Websites Visited", Icon: GlobeIcon },
  { key: "adventureStarted", label: "Adventure Started", Icon: AdventureIcon },
] as const;

export default function TotalActivityPanel({ stats }: Props) {
  const values: Record<string, string | number> = {
    pokemonCaught: stats.pokemonCaught,
    websitesVisited: stats.websitesVisited,
    adventureStarted: stats.adventureStarted,
  };

  return (
    <Card variant="game" tone="grass" className="p-3 w-full gap-0">
      <h2 className="font-bold text-black text-sm mb-3 tracking-wide">TOTAL ACTIVITY</h2>

      <div className="flex gap-3 justify-between">
        {STAT_DEFS.map(({ key, label, Icon }) => (
          <div key={key} className={`flex-1 bg-[#e0f4d9] rounded-[8px] border-4 border-black p-3 flex flex-col items-center shadow-inner justify-between`}>
            <div className="mb-2"><Icon /></div>
            <p className="text-black text-xs font-bold text-center leading-tight">{label}</p>
            <p className="text-black font-black text-lg mt-1">{values[key]}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
