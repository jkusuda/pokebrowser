"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ADMIN_SECTIONS } from "@/components/admin/sections";
import { cn } from "@/lib/utils";

type Props = {
  /** Trainer name of the signed-in admin, shown so it's obvious whose account tools act on. */
  trainerName: string;
};

/**
 * Shell for the admin tools: a section switcher plus the active section's
 * panel. Sections come from the ADMIN_SECTIONS registry — this component never
 * needs to change when one is added.
 */
export default function AdminDashboard({ trainerName }: Props) {
  const [activeId, setActiveId] = useState(ADMIN_SECTIONS[0].id);
  const active = ADMIN_SECTIONS.find((s) => s.id === activeId) ?? ADMIN_SECTIONS[0];
  const ActiveSection = active.Component;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 p-6 min-h-screen">
      {/* Header */}
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

      {/* Section switcher */}
      <div className="flex flex-wrap gap-2">
        {ADMIN_SECTIONS.map((section) => (
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

      {/* Active section */}
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
