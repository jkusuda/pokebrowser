"use client";

import { Card } from "@/components/ui/card";

// Static achievements data — defined outside component to avoid recreation on every render
const ACHIEVEMENTS = [
  { label: "Caught a Shiny", icon: "✨" },
  { label: "Won a Raid", icon: "🔴" },
  { label: "Evolved Starter", icon: "🐛" },
  { label: "Won a Raid", icon: "🐯" },
];

export default function RecentAchievementsPanel() {
  return (
    <Card variant="game" tone="grass" className="p-4 w-full mt-4 gap-0">
      <h2 className="font-bold text-black text-sm mb-4 tracking-wide">RECENT ACHIEVEMENTS</h2>

      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
        {ACHIEVEMENTS.map((ach, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-[8px] border-[3px] border-black bg-[#e0f4d9] flex items-center justify-center text-sm shadow-[1px_1px_0_black]`}>
              {ach.icon}
            </div>
            <span className="text-black font-bold text-sm tracking-wide">{ach.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
