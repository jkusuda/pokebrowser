"use client";

import { useEffect, useState } from "react";
import statsIcon from "@/assets/stats.png";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RefreshButton from "@/components/profile/RefreshButton";
import { LeaderboardRow, ShimmerRow } from "@/components/profile/LeaderboardRow";
import { SubTabButton } from "@/components/profile/SubTabButton";
import { api } from "@/lib/api";
import type { Board, LeaderboardCategory } from "api-client";

type Props = {
  /** True while the Global Stats page is the visible page. Drives lazy fetching. */
  active: boolean;
};

const CATEGORIES: { key: LeaderboardCategory; label: string; unit: string }[] = [
  { key: "catches", label: "POKÉMON CAUGHT", unit: "caught" },
  { key: "sites", label: "SITES EXPLORED", unit: "sites" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GlobalStatsPage({ active }: Props) {
  const [category, setCategory] = useState<LeaderboardCategory>("catches");
  const [friendsOnly, setFriendsOnly] = useState(false);
  // Cache each category+scope response so toggling back doesn't refetch.
  const [cache, setCache] = useState<Partial<Record<string, Board>>>({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fetchToken, setFetchToken] = useState(0);

  const cacheKey = `${category}:${friendsOnly ? "friends" : "global"}`;
  const data = cache[cacheKey];

  // Drops the current category+scope from the cache so the fetch effect re-runs.
  // Shared by the header refresh button and the failure Retry button.
  const handleRefetch = () => {
    setCache((prev) => {
      const next = { ...prev };
      delete next[cacheKey];
      return next;
    });
    setFetchToken((n) => n + 1);
  };

  useEffect(() => {
    // Lazy fetch: only once the page is visible, and only while the current
    // category+scope has no cached response (refresh/retry clear it).
    if (!active || data) return;

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    api.leaderboard(category, friendsOnly ? "friends" : "global")
      .then((res) => {
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [cacheKey]: res }));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });

    return () => { cancelled = true; };
    // fetchToken forces a refetch after handleRefetch clears the cache entry;
    // data is intentionally read at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, category, friendsOnly, fetchToken]);

  const unit = CATEGORIES.find((c) => c.key === category)?.unit ?? "";
  // Show the pinned "your placement" row only when the caller isn't already in
  // the visible top list.
  const meInTop = data?.top.some((e) => e.isMe) ?? false;
  const showMeFooter = !!data?.me && !meInTop;

  return (
    <Card variant="game" tone="glass" className="h-full w-full p-4 mt-2 overflow-hidden gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-emboss text-xl">GLOBAL STATS</h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="game"
            tone={friendsOnly ? "primary" : "neutral"}
            size="sm"
            className="h-8 px-3 text-[0.5625rem] border-2 shadow-[2px_2px_0_black] [-webkit-text-stroke:0px] [text-shadow:none]"
            aria-pressed={friendsOnly}
            onClick={() => setFriendsOnly((v) => !v)}
            title={friendsOnly ? "Showing friends only" : "Showing all trainers"}
          >
            Friends
          </Button>
          <RefreshButton onRefresh={handleRefetch} refreshing={loading} />
          <img src={statsIcon.src} alt="" className="w-8 h-8 object-contain opacity-70" />
        </div>
      </div>

      {/* Category toggle */}
      <div className="flex items-center gap-1 border-b-2 border-black/10 mb-4">
        {CATEGORIES.map((c) => (
          <SubTabButton
            key={c.key}
            active={category === c.key}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </SubTabButton>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
        {failed ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <span className="font-black tracking-widest uppercase text-[0.6875rem] text-pb-ink/60 text-center">
              Couldn&apos;t load the leaderboard
            </span>
            <Button variant="game" tone="neutral" size="sm" onClick={handleRefetch}>
              Retry
            </Button>
          </div>
        ) : loading && !data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => <ShimmerRow key={i} />)}
          </div>
        ) : data && data.top.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <span className="font-black tracking-widest uppercase text-[0.625rem] text-pb-ink/40 text-center leading-relaxed">
              NO RANKINGS YET<br />BE THE FIRST TO CATCH SOMETHING!
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Index key: masked strangers all have id === null, and rank
                ties are common, so neither is unique. */}
            {data?.top.map((entry, i) => (
              <LeaderboardRow key={i} entry={entry} unit={unit} />
            ))}
          </div>
        )}
      </div>

      {/* Pinned "your placement" row when outside the top list */}
      {showMeFooter && data?.me && (
        <div className="mt-3 pt-3 border-t-2 border-black/10">
          <LeaderboardRow entry={data.me} unit={unit} />
        </div>
      )}

      {/* No stats yet for the caller */}
      {data && !data.me && !loading && (
        <p className="mt-3 pt-3 border-t-2 border-black/10 font-black tracking-widest uppercase text-[0.5rem] text-pb-ink/40 text-center">
          Catch a Pokémon to join the rankings
        </p>
      )}
    </Card>
  );
}
