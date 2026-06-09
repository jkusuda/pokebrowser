"use client";

import statsIcon from "@/assets/stats.png";
import { Card } from "@/components/ui/card";

export default function GlobalStatsPage() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <Card variant="game" tone="glass" className="p-10 items-center gap-4">
        <img src={statsIcon.src} alt="Stats" className="w-20 h-20 object-contain drop-shadow-md opacity-60" />
        <span className="text-emboss text-2xl text-center">GLOBAL STATS</span>
        <span className="font-bold text-sm text-black/50 tracking-wide">COMING SOON</span>
      </Card>
    </div>
  );
}
