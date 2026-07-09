"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { UserStats } from "@/types";
import { GEN1_TYPES, getTypeColor, getTypeIconPath } from "@/lib/types";

type Props = {
  userStats: UserStats | null;
  pokedexCount: number;
  friendCount: number;
};

// ── date helpers (calendar-part based — never parse via new Date(str) to
//    avoid a UTC day-shift on the 'YYYY-MM-DD' keys) ────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Small Pokéball marker (same construction as TotalActivityPanel's icon, sized down)
function PokeballDot() {
  return (
    <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-black overflow-hidden relative">
      <div className="h-1/2 w-full bg-red-500 absolute top-0" />
      <div className="w-full h-px bg-black absolute top-1/2 -mt-px z-10" />
      <div className="w-1.5 h-1.5 rounded-full bg-white border border-black absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] z-20" />
    </div>
  );
}

// ── streak chips ─────────────────────────────────────────────────────────────
function StreakChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="w-full bg-pb-bg rounded-lg border-2 border-black px-3 py-2.5 shadow-[1px_1px_0_black]">
      <p className="text-black/60 text-[10px] font-bold leading-tight uppercase tracking-wide">{label}</p>
      <p className={`font-black text-2xl leading-tight ${accent ? "text-pb-poppy" : "text-black"}`}>{value}</p>
    </div>
  );
}

function StreakCard({
  current,
  best,
  pokedexCount,
  friendCount,
}: {
  current: number;
  best: number;
  pokedexCount: number;
  friendCount: number;
}) {
  return (
    <Card variant="game" tone="grass" className="p-4 mt-4 gap-3 justify-between">
      <StreakChip label="Current Streak" value={`${current}d`} accent />
      <StreakChip label="Best Streak" value={`${best}d`} />
      <StreakChip label="Pokédex" value={`${pokedexCount} / 151`} />
      <StreakChip label="Friends" value={`${friendCount}`} />
    </Card>
  );
}

// ── month calendar ───────────────────────────────────────────────────────────
function MonthCalendar({ activeDays }: { activeDays: Set<string> }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // "next" is disabled once we're viewing the current month
  const atCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const goPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goNext = () => { if (!atCurrentMonth) setViewDate(new Date(year, month + 1, 1)); };

  const navBtn =
    "w-6 h-6 flex items-center justify-center rounded-md border-2 border-black bg-pb-bg text-black font-black " +
    "shadow-[1px_1px_0_black] hover:bg-pb-leaf active:shadow-none active:translate-x-px active:translate-y-px " +
    "disabled:opacity-30 disabled:pointer-events-none";

  return (
    <div className="w-[260px] shrink-0">
      {/* Month header + nav */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={goPrev} className={navBtn} aria-label="Previous month">‹</button>
        <p className="text-black font-black text-sm tracking-wide">
          {MONTH_NAMES[month]} {year}
        </p>
        <button type="button" onClick={goNext} className={navBtn} disabled={atCurrentMonth} aria-label="Next month">›</button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-black/50 text-[10px] font-bold">{w}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const key = dateKey(year, month, day);
          const active = activeDays.has(key);
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              title={key}
              className={`relative aspect-square rounded-md flex items-center justify-center text-[10px] font-bold
                ${active ? "" : "text-black/40"}
                ${isToday ? "ring-2 ring-pb-pine ring-offset-1 ring-offset-pb-leaf" : ""}`}
            >
              {active ? <PokeballDot /> : day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── type grid (18 slots: 17 Gen 1 types + dark, always grayed) ───────────────
const TYPE_ORDER = [...GEN1_TYPES, "dark"] as const;

function TypeGrid({ caught }: { caught: Set<string> }) {
  return (
    <div className="w-full sm:w-auto">
      <p className="text-black/60 text-[10px] font-bold uppercase tracking-wide mb-2">
        Types Caught <span className="text-pb-pine">{caught.size} / 18</span>
      </p>
      <div className="grid grid-cols-6 gap-1 justify-items-center">
        {TYPE_ORDER.map((type) => {
          const has = caught.has(type);
          const color = getTypeColor(type);
          return (
            <div
              key={type}
              title={type}
              className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border-2 shadow-[1px_1px_0_black]"
              style={
                has
                  ? { backgroundColor: color.background, borderColor: color.border }
                  : { backgroundColor: "#c9d3c4", borderColor: "#9aa895" }
              }
            >
              <img
                src={getTypeIconPath(type)}
                alt={type}
                className={`w-8 h-8 object-contain ${has ? "" : "grayscale opacity-40"}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TrainerStatsPanel({ userStats, pokedexCount, friendCount }: Props) {
  const activeDays = useMemo(
    () => new Set(userStats?.active_dates ?? []),
    [userStats?.active_dates]
  );
  const caughtTypes = useMemo(
    () => new Set((userStats?.types_caught ?? []).map((t) => t.toLowerCase())),
    [userStats?.types_caught]
  );

  return (
    <div className="grid grid-cols-3 items-stretch gap-4 w-full">
      <StreakCard
        current={userStats?.current_streak ?? 0}
        best={userStats?.longest_streak ?? 0}
        pokedexCount={pokedexCount}
        friendCount={friendCount}
      />

      <Card variant="game" tone="grass" className="p-4 mt-4 gap-0 col-span-2">
        <h2 className="font-bold text-black text-sm mb-3 tracking-wide">STATS</h2>

        {/* Calendar + type grid — side by side */}
        <div className="flex flex-row items-start gap-4">
          <MonthCalendar activeDays={activeDays} />
          <TypeGrid caught={caughtTypes} />
        </div>
      </Card>
    </div>
  );
}
