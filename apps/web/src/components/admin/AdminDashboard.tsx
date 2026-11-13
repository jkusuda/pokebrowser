"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EventsSection from "./EventsSection";
import PlayerToolsSection from "./PlayerToolsSection";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    id: "events",
    label: "Events",
    blurb: "Schedule, edit and delete the time-boxed events players compete in.",
    Component: EventsSection,
  },
  {
    id: "player-tools",
    label: "Player Tools",
    blurb: "Grant yourself tokens, XP and achievement unlocks to test reward flows.",
    Component: PlayerToolsSection,
  },
];

type Props = {
  trainerName: string;
};

export default function AdminDashboard({ trainerName }: Props) {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0];
  const ActiveSection = active.Component;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 p-6 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-emboss text-2xl">ADMIN</h1>
          <p className="font-black tracking-widest uppercase text-[10px] text-pb-ink/60 mt-1">
            Signed in as {trainerName}
          </p>
        </div>
        <Button variant="game" tone="neutral" size="sm" asChild>
          <Link href="/profile">← Back to Profile</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <Button
            key={section.id}
            variant="game"
            tone={section.id === activeId ? "primary" : "neutral"}
            size="sm"
            aria-pressed={section.id === activeId}
            className={cn(section.id !== activeId && "opacity-80")}
            onClick={() => setActiveId(section.id)}
          >
            {section.label}
          </Button>
        ))}
      </div>

      <Card variant="game" tone="cream" size="lg" className="flex-1">
        <div className="flex flex-col gap-1 mb-4">
          <h2 className="text-emboss-sm text-lg">{active.label.toUpperCase()}</h2>
          <p className="text-sm text-pb-ink/70 font-medium">{active.blurb}</p>
        </div>
        <ActiveSection />
      </Card>
    </div>
  );
}
