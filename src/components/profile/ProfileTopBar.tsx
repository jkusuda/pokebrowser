"use client";

import Image from "next/image";
import netPng from "@/assets/net.png";
import { Card } from "@/components/ui/card";

type Page = "home" | "globalStats" | "pokedex" | "settings";

// Static — defined outside component to avoid recreation on every render
const NAV_ITEMS: { label: string; page: Page }[] = [
  { label: "Home", page: "home" },
  { label: "Global Stats", page: "globalStats" },
  { label: "Pokedex", page: "pokedex" },
  { label: "Settings", page: "settings" },
];

type Props = {
  activePage: Page;
  onPageChange: (page: Page) => void;
};

export default function ProfileTopBar({ activePage, onPageChange }: Props) {
  return (
    <Card variant="game" tone="grass" className="w-full p-3 flex-row items-center mb-4 relative gap-0">
      {/* Logo (left-anchored) */}
      <div className="absolute left-6 flex items-center gap-2">
        <Image src={netPng} alt="Net" width={32} height={32} className="opacity-80" />
        <span className="text-black font-bold text-lg tracking-wide">Pokebrowser</span>
      </div>

      {/* Centered navigation buttons */}
      <div className="flex-1 flex items-center justify-center gap-8">
        {NAV_ITEMS.map(({ label, page }) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`text-black text-sm font-bold transition-colors hover:bg-[#8abf8a] px-4 py-1.5 rounded-[8px] ${activePage === page ? "bg-[#8abf8a]" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
}
