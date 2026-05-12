"use client";

import statsIcon from "@/assets/stats.png";
import { Card } from "@/components/ui/card";

export default function GlobalStatsPage() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <Card variant="game" tone="glass" className="p-10 items-center gap-4">
        <img src={statsIcon.src} alt="Stats" className="w-20 h-20 object-contain drop-shadow-md opacity-60" />
        <span
          className="font-black text-2xl tracking-widest text-white text-center"
          style={{ WebkitTextStroke: "1.5px black", textShadow: "0px 2px 0px black" }}
        >
          GLOBAL STATS
        </span>
        <span className="font-bold text-sm text-black/50 tracking-wide">COMING SOON</span>
      </Card>
    </div>
  );
}
