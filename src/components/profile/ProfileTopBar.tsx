"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Top-level profile pages, shared with ProfileContent's page switcher. */
export type Page = "home" | "globalStats" | "pokedex" | "settings";

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
      {/* Wordmark (left-anchored) */}
      <div className="absolute left-6 flex items-center gap-2">
        <span className="text-black font-bold text-lg tracking-wide">Pokebrowser</span>
      </div>

      {/* Centered navigation buttons */}
      <div className="flex-1 flex items-center justify-center gap-8">
        {NAV_ITEMS.map(({ label, page }) => (
          <Button
            key={page}
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page)}
            className={cn(
              "text-black text-sm font-bold rounded-[8px] hover:bg-pb-accent-deep",
              activePage === page && "bg-pb-accent-deep"
            )}
          >
            {label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
