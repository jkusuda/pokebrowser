"use client";

import pokeballIcon from "@/assets/pokeball.png";
import friendsIcon from "@/assets/friends.png";
import awardsIcon from "@/assets/awards.png";
import statsIcon from "@/assets/stats.png";
import { Card } from "@/components/ui/card";

// Static — defined outside component to avoid recreation on every render
const NAV_ITEMS = [
  { label: "COLLECTION", tab: "collection", icon: pokeballIcon.src },
  { label: "FRIENDS", tab: "friends", icon: friendsIcon.src },
  { label: "ACHIEVEMENTS", tab: "achievements", icon: awardsIcon.src },
  { label: "STATS", tab: "stats", icon: statsIcon.src },
];

const btnClass = (isActive: boolean) =>
  `flex-1 flex flex-col items-center justify-center py-5 px-4 rounded-[8px] border-[4px] border-black shadow-[4px_4px_0_black] transition-transform hover:-translate-y-1 hover:bg-[#8abf8a] active:translate-y-1 active:shadow-[1px_1px_0_black] ${isActive ? "bg-[#8abf8a]" : "bg-[#9dcd9d]"
  }`;

type Props = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

export default function ProfileBottomNav({ activeTab, onTabChange }: Props) {
  return (
    <Card variant="game" tone="grass" className="mt-4 w-full p-4 flex-row gap-5">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.tab}
          onClick={() => onTabChange(item.tab)}
          className={btnClass(activeTab === item.tab)}
        >
          <img src={item.icon} alt={item.label} className="w-16 h-16 mb-3 object-contain drop-shadow-md" />
          <span
            className="font-black tracking-widest text-[#ffffff] text-lg text-center leading-none"
            style={{ WebkitTextStroke: "1.5px black", textShadow: "0px 2px 0px black" }}
          >
            {item.label}
          </span>
        </button>
      ))}
    </Card>
  );
}
