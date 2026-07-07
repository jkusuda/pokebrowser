"use client";

import { useEffect, useState } from "react";
import statsIcon from "@/assets/stats.png";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRAINER_BASE } from "@/lib/pokemon";
import { LeaderboardCategory, LeaderboardEntry, LeaderboardResponse } from "@/types";

type Props = {
  /** True while the Global Stats page is the visible page. Drives lazy fetching. */
  active: boolean;
};

const CATEGORIES: { key: LeaderboardCategory; label: string; unit: string }[] = [
  { key: "catches", label: "POKÉMON CAUGHT", unit: "caught" },
  { key: "sites", label: "SITES EXPLORED", unit: "sites" },
];

/** Gold / silver / bronze tints for the top 3 ranks; muted otherwise. */
function rankBadgeClass(rank: number): string {
  if (rank === 1) return "bg-yellow-300 text-black border-black";
  if (rank === 2) return "bg-gray-200 text-black border-black";
  if (rank === 3) return "bg-orange-300 text-black border-black";
  return "bg-pb-bg text-pb-forest border-black/30";
}

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={cn("bg-pb-pine/30 animate-pulse rounded-lg", className)} />;
}

function ShimmerRow() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-black/10">
      <Shimmer className="w-9 h-9 rounded-lg shrink-0" />
      <Shimmer className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Shimmer className="h-3 w-28" />
        <Shimmer className="h-2 w-20" />
      </div>
      <Shimmer className="h-4 w-10" />
    </div>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────

function LeaderboardRow({ entry, unit }: { entry: LeaderboardEntry; unit: string }) {
  const [copied, setCopied] = useState(false);
  const masked = entry.is_private && !entry.is_me;
  const canCopy = !masked && !entry.is_me && !!entry.friend_code;

  const handleCopy = async () => {
    if (!canCopy || !entry.friend_code) return;
    await navigator.clipboard.writeText(entry.friend_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={canCopy ? handleCopy : undefined}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border-2 transition-colors",
        entry.is_me
          ? "bg-pb-grass/60 border-pb-pine"
          : "bg-white border-black/15",
        canCopy && "cursor-pointer hover:border-pb-pine/60"
      )}
      title={canCopy ? "Click to copy friend code" : undefined}
    >
      {/* Rank badge */}
      <div
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg border-2 shrink-0 font-black text-sm shadow-[2px_2px_0_rgba(0,0,0,0.25)]",
          rankBadgeClass(entry.rank)
        )}
      >
        {entry.rank}
      </div>

      {/* Avatar */}
      {masked ? (
        <div className="w-10 h-10 rounded-lg bg-pb-pine/15 border-2 border-black/10 flex items-center justify-center shrink-0 text-pb-forest/50 font-black text-lg">
          ?
        </div>
      ) : (
        <img
          src={`${TRAINER_BASE}/${entry.avatar_id}.png`}
          alt={entry.trainer_name ?? "Trainer"}
          className="w-10 h-10 object-contain shrink-0"
          style={{ imageRendering: "pixelated" }}
        />
      )}

      {/* Name + friend code */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-pb-forest truncate">
          {masked ? "Anonymous Trainer" : entry.trainer_name}
          {entry.is_me && <span className="ml-1.5 text-pb-pine font-black text-[9px] tracking-widest uppercase">YOU</span>}
        </p>
        {masked ? (
          <p className="font-black tracking-widest uppercase text-[7px] text-pb-forest/40 mt-0.5">PRIVATE</p>
        ) : (
          <p className="font-mono tracking-widest text-[9px] text-pb-pine/80 mt-0.5">
            {copied ? "COPIED!" : entry.friend_code}
          </p>
        )}
      </div>

      {/* Stat value */}
      <div className="flex flex-col items-end shrink-0">
        <span className="font-black text-base text-pb-forest leading-none">{entry.value}</span>
        <span className="font-black tracking-widest uppercase text-[7px] text-pb-forest/50 mt-0.5">{unit}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GlobalStatsPage({ active }: Props) {
  const [category, setCategory] = useState<LeaderboardCategory>("catches");
  // Cache each category's response so toggling back doesn't refetch.
  const [cache, setCache] = useState<Partial<Record<LeaderboardCategory, LeaderboardResponse>>>({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const data = cache[category];

  useEffect(() => {
    // Lazy fetch: only once the page is visible, and only the first time each
    // category is viewed (unless a retry was requested).
    if (!active || (data && retryToken === 0)) return;

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    fetch(`/api/leaderboard?category=${category}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res: LeaderboardResponse) => {
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [category]: res }));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });

    return () => { cancelled = true; };
    // retryToken forces a refetch; data is intentionally read at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, category, retryToken]);

  const unit = CATEGORIES.find((c) => c.key === category)?.unit ?? "";
  // Show the pinned "your placement" row only when the caller isn't already in
  // the visible top list.
  const meInTop = data?.top.some((e) => e.is_me) ?? false;
  const showMeFooter = !!data?.me && !meInTop;

  return (
    <Card variant="game" tone="glass" className="h-full w-full p-4 mt-2 overflow-hidden gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-emboss text-xl">GLOBAL STATS</h2>
        <img src={statsIcon.src} alt="" className="w-8 h-8 object-contain opacity-70" />
      </div>

      {/* Category toggle */}
      <div className="flex items-center gap-1 border-b-2 border-black/10 mb-4">
        {CATEGORIES.map((c) => {
          const isActive = category === c.key;
          return (
            <Button
              key={c.key}
              variant="ghost"
              size="sm"
              onClick={() => setCategory(c.key)}
              className={cn(
                "h-auto px-3 py-1.5 text-[9px] font-black tracking-widest uppercase rounded-t-lg rounded-b-none border-b-2 -mb-[2px]",
                isActive
                  ? "text-pb-forest border-pb-pine bg-black/5 hover:bg-black/5"
                  : "text-pb-forest/50 border-transparent hover:text-pb-forest/80"
              )}
            >
              {c.label}
            </Button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
        {failed ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <span className="font-black tracking-widest uppercase text-[11px] text-pb-forest/60 text-center">
              Couldn&apos;t load the leaderboard
            </span>
            <Button variant="game" tone="neutral" size="sm" onClick={() => setRetryToken((n) => n + 1)}>
              Retry
            </Button>
          </div>
        ) : loading && !data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => <ShimmerRow key={i} />)}
          </div>
        ) : data && data.top.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <span className="font-black tracking-widest uppercase text-[10px] text-pb-forest/40 text-center leading-relaxed">
              NO RANKINGS YET<br />BE THE FIRST TO CATCH SOMETHING!
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data?.top.map((entry) => (
              <LeaderboardRow key={`${entry.rank}-${entry.id ?? "anon"}`} entry={entry} unit={unit} />
            ))}
          </div>
        )}
      </div>

      {/* Pinned "your placement" row when outside the top list */}
      {showMeFooter && data?.me && (
        <div className="mt-3 pt-3 border-t-2 border-black/10">
          <LeaderboardRow
            entry={{
              rank: data.me.rank,
              value: data.me.value,
              is_private: false,
              is_me: true,
              id: null,
              trainer_name: data.me.trainer_name,
              avatar_id: data.me.avatar_id,
              friend_code: data.me.friend_code,
            }}
            unit={unit}
          />
        </div>
      )}

      {/* No stats yet for the caller */}
      {data && !data.me && !loading && (
        <p className="mt-3 pt-3 border-t-2 border-black/10 font-black tracking-widest uppercase text-[8px] text-pb-forest/40 text-center">
          Catch a Pokémon to join the rankings
        </p>
      )}
    </Card>
  );
}
