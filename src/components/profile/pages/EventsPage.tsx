"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/ui/shimmer";
import RefreshButton from "@/components/profile/RefreshButton";
import { LeaderboardRow, ShimmerRow } from "@/components/profile/LeaderboardRow";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { EVENT_TRACKED_STATS, tokenLabel } from "@/lib/events-data";
import { getTypeColor, getTypeIconPath } from "@/lib/types";
import { getPokedexSprite, getPokemonName } from "@/lib/pokemon";
import { GENERATIONS, type Generation } from "pokemon-data";
import { cn } from "@/lib/utils";
import { EventsResponse, GameEvent, LeaderboardResponse } from "@/types";

type Props = {
  /** True while the Events page is the visible page. Drives lazy fetching. */
  active: boolean;
};

function formatDateRange(event: GameEvent): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(event.starts_at).toLocaleDateString("en-US", opts);
  const end = new Date(event.ends_at).toLocaleDateString("en-US", {
    ...opts,
    year: "numeric",
  });
  return `${start} – ${end}`;
}

/** Chunky pill showing one active event bonus (e.g. "2x XP"). */
function BonusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg border-2 border-black bg-pb-accent shadow-[2px_2px_0_black] font-black text-[10px] uppercase tracking-wider text-black">
      {label}
    </span>
  );
}

/** Small coloured type badge with its icon. */
function TypeChip({ type }: { type: string }) {
  const color = getTypeColor(type);
  const icon = getTypeIconPath(type);
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-bold normal-case tracking-normal text-[9px] text-white"
      style={{ backgroundColor: color.background, borderColor: color.border }}
    >
      {icon && <img src={icon} alt="" className="w-3 h-3" />}
      {type}
    </span>
  );
}

/** Tracked-stat line with the type icon when the event is type-filtered. */
function TrackedStatLabel({ event }: { event: GameEvent }) {
  const meta = EVENT_TRACKED_STATS[event.tracked_stat];
  return (
    <span className="inline-flex items-center gap-1.5 font-black tracking-widest uppercase text-[9px] text-pb-ink/60">
      Tracking: {meta.label}
      {event.type_filter && <TypeChip type={event.type_filter} />}
    </span>
  );
}

/** Small sprite + name pill, used for the spotlight Pokémon. */
function PokemonPill({ pokedex, prefix }: { pokedex: number; prefix?: string }) {
  return (
    <span className="inline-flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-lg border-2 border-black bg-white shadow-[2px_2px_0_black] font-black text-[10px] uppercase tracking-wider text-black">
      <img
        src={getPokedexSprite(pokedex)}
        alt=""
        className="w-6 h-6 -my-1 [image-rendering:pixelated]"
      />
      {prefix}
      {getPokemonName(pokedex)}
    </span>
  );
}

/** Neutral pill naming a boosted generation, e.g. "Gen 2 · Johto". */
function GenerationChip({ gen }: { gen: number }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-black/40 bg-white font-bold normal-case tracking-normal text-[9px] text-pb-ink">
      Gen {gen} · {GENERATIONS[gen as Generation]?.name}
    </span>
  );
}

/** Spotlight Pokémon and boosted types/generations — what's spawning more while the event runs. */
function SpawnModifiers({ event }: { event: GameEvent }) {
  if (
    event.spotlight_pokedex === null &&
    event.boosted_types.length === 0 &&
    event.boosted_generations.length === 0
  ) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {event.spotlight_pokedex !== null && (
        <PokemonPill pokedex={event.spotlight_pokedex} prefix="★ Spotlight: " />
      )}
      {event.boosted_types.length > 0 && (
        <span className="inline-flex flex-wrap items-center gap-1 font-black tracking-widest uppercase text-[9px] text-pb-ink/60">
          More common:
          {event.boosted_types.map((t) => (
            <TypeChip key={t} type={t} />
          ))}
        </span>
      )}
      {event.boosted_generations.length > 0 && (
        <span className="inline-flex flex-wrap items-center gap-1 font-black tracking-widest uppercase text-[9px] text-pb-ink/60">
          {event.boosted_types.length > 0 ? "And from:" : "More common:"}
          {event.boosted_generations.map((g) => (
            <GenerationChip key={g} gen={g} />
          ))}
        </span>
      )}
    </div>
  );
}

/** Shared progress toward the event's community goal, and what it unlocks. */
function CommunityGoalPanel({ event, myProgress }: { event: GameEvent; myProgress: number }) {
  if (event.community_goal === null || event.reward_token_type === null) return null;
  const goal = event.community_goal;
  const progress = Math.min(event.community_progress, goal);
  const pct = Math.round((progress / goal) * 100);
  const reached = event.goal_reached_at !== null;
  const unit = EVENT_TRACKED_STATS[event.tracked_stat].unit;
  const reward = tokenLabel(event.reward_token_type, event.reward_pokedex);

  return (
    <div className="flex flex-col gap-1.5 pt-2 border-t-2 border-black/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-black tracking-widest uppercase text-[10px] text-pb-ink/70">
          Community Goal
        </span>
        <span className="inline-flex items-center gap-1 font-black text-[10px] uppercase tracking-wider text-pb-ink/70">
          Reward:
          {event.reward_token_type === "species" && event.reward_pokedex !== null && (
            <img
              src={getPokedexSprite(event.reward_pokedex)}
              alt=""
              className="w-6 h-6 -my-1 [image-rendering:pixelated]"
            />
          )}
          {reward}
        </span>
      </div>
      <div
        className="h-4 w-full rounded-full border-2 border-black bg-white overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={progress}
        aria-label="Community goal progress"
      >
        <div
          className={cn("h-full transition-[width]", reached ? "bg-pb-accent" : "bg-pb-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono tracking-wide text-[10px] text-pb-ink/70">
        {event.community_progress.toLocaleString()} / {goal.toLocaleString()} {unit} by all trainers
      </span>
      {reached ? (
        <span className="font-black tracking-widest uppercase text-[10px] text-pb-poppy">
          {myProgress > 0
            ? `Goal reached! Your ${reward} is in Achievements → Unopened Tokens`
            : `Goal reached! Score once before the event ends to get your ${reward}`}
        </span>
      ) : (
        <span className="font-bold text-[10px] text-pb-ink/60">
          Every trainer who scores during the event gets the reward when the goal is reached.
        </span>
      )}
    </div>
  );
}

/** Compact row for the upcoming/past lists. */
function EventListRow({ event, dimmed }: { event: GameEvent; dimmed?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 p-3 bg-white rounded-xl border-2 border-black/15",
        dimmed && "opacity-60"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-pb-ink truncate">{event.name}</p>
        <TrackedStatLabel event={event} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {event.spotlight_pokedex !== null && <PokemonPill pokedex={event.spotlight_pokedex} prefix="★ " />}
        {event.boosted_types.map((t) => (
          <TypeChip key={t} type={t} />
        ))}
        {event.boosted_generations.map((g) => (
          <GenerationChip key={g} gen={g} />
        ))}
        {event.bonuses.map((b, i) => (
          <BonusPill key={i} label={b.label} />
        ))}
        {event.community_goal !== null && event.reward_token_type !== null && (
          <BonusPill label={`Goal → ${tokenLabel(event.reward_token_type, event.reward_pokedex)}`} />
        )}
      </div>
      <span className="font-mono tracking-wide text-[10px] text-pb-ink/60 shrink-0">
        {formatDateRange(event)}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/** Cached event data older than this is refetched when the page is reopened. */
const STALE_MS = 60_000;
/** setTimeout tops out around 24.8 days, so long waits re-arm in chunks. */
const MAX_TIMER_MS = 6 * 60 * 60 * 1000;

export default function EventsPage({ active }: Props) {
  const [data, setData] = useState<EventsResponse | null>(null);
  /** When `data` was fetched — a ref so it can't retrigger the fetch effect. */
  const fetchedAtRef = useRef(0);
  const [failed, setFailed] = useState(false);
  const [fetchToken, setFetchToken] = useState(0);
  const [boundaryTick, setBoundaryTick] = useState(0);

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // Cache per event id so re-toggling the panel doesn't refetch.
  const [lbCache, setLbCache] = useState<Partial<Record<string, LeaderboardResponse>>>({});
  const [lbFailed, setLbFailed] = useState(false);

  const handleRefetch = useCallback(() => {
    setData(null);
    setLbCache({});
    fetchedAtRef.current = 0;
    setFetchToken((n) => n + 1);
  }, []);

  useEffect(() => {
    // Lazy fetch: only once the page is visible, and only when there's no data
    // or the cached data has gone stale (catches made in the extension move
    // myProgress, so reopening the page should show the current number).
    if (!active) return;
    if (fetchedAtRef.current && Date.now() - fetchedAtRef.current < STALE_MS) return;

    let cancelled = false;

    fetch("/api/events")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res: EventsResponse) => {
        if (cancelled) return;
        fetchedAtRef.current = Date.now();
        setFailed(false);
        setData(res);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
      });

    return () => { cancelled = true; };
  }, [active, fetchToken]);

  const current = data?.current ?? null;
  const nextUp = data?.upcoming[0] ?? null;
  const leaderboard = current ? lbCache[current.id] : undefined;

  // The next moment the current/upcoming split changes: the live event ending,
  // or the next one starting. Without this the page would keep rendering an
  // event that finished hours ago.
  const boundaryIso = current?.ends_at ?? nextUp?.starts_at ?? null;

  useEffect(() => {
    if (!active || !data || !boundaryIso) return;

    // Server time now = the time the server stamped, plus how long ago we got it.
    const serverNowMs = Date.parse(data.serverNow) + (Date.now() - fetchedAtRef.current);
    const msUntilBoundary = Date.parse(boundaryIso) - serverNowMs + 1000;

    const timer = setTimeout(
      () => {
        // Still hours away — re-arm rather than trust one giant timeout.
        if (msUntilBoundary > MAX_TIMER_MS) setBoundaryTick((n) => n + 1);
        else handleRefetch();
      },
      Math.max(0, Math.min(msUntilBoundary, MAX_TIMER_MS))
    );
    return () => clearTimeout(timer);
  }, [active, data, boundaryIso, boundaryTick, handleRefetch]);

  // Fetch the event leaderboard the first time it's shown for this event.
  useEffect(() => {
    if (!showLeaderboard || !current || leaderboard) return;

    let cancelled = false;

    fetch(`/api/events/leaderboard?eventId=${current.id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res: LeaderboardResponse) => {
        if (cancelled) return;
        setLbFailed(false);
        setLbCache((prev) => ({ ...prev, [current.id]: res }));
      })
      .catch(() => {
        if (cancelled) return;
        setLbFailed(true);
      });

    return () => { cancelled = true; };
  }, [showLeaderboard, current, leaderboard]);

  const endsIn = useCountdown(current?.ends_at ?? null, data?.serverNow ?? null);
  const nextStartsIn = useCountdown(
    !current && nextUp ? nextUp.starts_at : null,
    data?.serverNow ?? null
  );

  // Derived rather than stored: "loading" is exactly "nothing to show and
  // nothing went wrong yet", which keeps the fetch effects free of the
  // synchronous setState that triggers cascading renders.
  const loading = !data && !failed;
  const lbLoading = !leaderboard && !lbFailed;

  const unit = current ? EVENT_TRACKED_STATS[current.tracked_stat].unit : "";
  const meInTop = leaderboard?.top.some((e) => e.is_me) ?? false;
  const showMeFooter = !!leaderboard?.me && !meInTop;

  return (
    <Card variant="game" tone="glass" className="h-full w-full p-4 mt-2 overflow-hidden gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-emboss text-xl">EVENTS</h2>
        <RefreshButton onRefresh={handleRefetch} refreshing={loading} />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0 flex flex-col gap-4">
        {failed ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <span className="font-black tracking-widest uppercase text-[11px] text-pb-ink/60 text-center">
              Couldn&apos;t load events
            </span>
            <Button variant="game" tone="neutral" size="sm" onClick={handleRefetch}>
              Retry
            </Button>
          </div>
        ) : loading || !data ? (
          <div className="flex flex-col gap-3">
            <Shimmer className="h-36 w-full rounded-xl" />
            <Shimmer className="h-12 w-full rounded-xl" />
            <Shimmer className="h-12 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* Current event hero */}
            {current ? (
              <div className="bg-white rounded-xl border-4 border-black shadow-[4px_4px_0_black] p-4 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-emboss-sm text-lg">{current.name.toUpperCase()}</h3>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg border-2 border-black bg-pb-poppy shadow-[2px_2px_0_black] font-black text-[10px] uppercase tracking-wider text-white">
                    Ends in {endsIn ?? "…"}
                  </span>
                </div>
                {current.description && (
                  <p className="text-sm text-pb-ink/80 font-medium">{current.description}</p>
                )}
                <TrackedStatLabel event={current} />
                <SpawnModifiers event={current} />
                {current.bonuses.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {current.bonuses.map((b, i) => (
                      <BonusPill key={i} label={b.label} />
                    ))}
                  </div>
                )}
                <CommunityGoalPanel event={current} myProgress={data.myProgress ?? 0} />
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t-2 border-black/10">
                  <span className="font-black tracking-widest uppercase text-[10px] text-pb-primary">
                    My progress: {data.myProgress ?? 0} {unit}
                  </span>
                  <Button
                    variant="game"
                    tone="neutral"
                    size="sm"
                    className="h-8 px-3 text-[9px] border-2 shadow-[2px_2px_0_black] [-webkit-text-stroke:0px] [text-shadow:none]"
                    aria-pressed={showLeaderboard}
                    onClick={() => setShowLeaderboard((v) => !v)}
                  >
                    {showLeaderboard ? "Hide Leaderboard" : "Show Leaderboard"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border-4 border-black shadow-[4px_4px_0_black] p-4 flex flex-col items-center gap-2 text-center">
                {nextUp ? (
                  <>
                    <span className="font-black tracking-widest uppercase text-[10px] text-pb-ink/50">
                      No active event
                    </span>
                    <h3 className="text-emboss-sm text-lg">NEXT: {nextUp.name.toUpperCase()}</h3>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg border-2 border-black bg-pb-accent shadow-[2px_2px_0_black] font-black text-[10px] uppercase tracking-wider text-black">
                      Starts in {nextStartsIn ?? "…"}
                    </span>
                  </>
                ) : (
                  <span className="font-black tracking-widest uppercase text-[10px] text-pb-ink/40 leading-relaxed">
                    NO EVENTS SCHEDULED<br />CHECK BACK SOON!
                  </span>
                )}
              </div>
            )}

            {/* Event leaderboard */}
            {current && showLeaderboard && (
              <div className="flex flex-col gap-2">
                <h4 className="font-black tracking-widest uppercase text-[10px] text-pb-ink/60">
                  Event Leaderboard — {EVENT_TRACKED_STATS[current.tracked_stat].label}
                </h4>
                {lbFailed ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <span className="font-black tracking-widest uppercase text-[11px] text-pb-ink/60 text-center">
                      Couldn&apos;t load the leaderboard
                    </span>
                    <Button
                      variant="game"
                      tone="neutral"
                      size="sm"
                      onClick={() => {
                        setLbCache((prev) => {
                          const next = { ...prev };
                          delete next[current.id];
                          return next;
                        });
                        setLbFailed(false);
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                ) : lbLoading && !leaderboard ? (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 5 }).map((_, i) => <ShimmerRow key={i} />)}
                  </div>
                ) : leaderboard && leaderboard.top.length === 0 ? (
                  <span className="font-black tracking-widest uppercase text-[10px] text-pb-ink/40 text-center py-4 leading-relaxed">
                    NO RANKINGS YET<br />BE THE FIRST TO SCORE!
                  </span>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Index key: masked strangers all have id === null, and
                        rank ties are common, so neither is unique. */}
                    {leaderboard?.top.map((entry, i) => (
                      <LeaderboardRow key={i} entry={entry} unit={unit} />
                    ))}
                    {showMeFooter && leaderboard?.me && (
                      <div className="mt-1 pt-3 border-t-2 border-black/10">
                        <LeaderboardRow
                          entry={{
                            rank: leaderboard.me.rank,
                            value: leaderboard.me.value,
                            is_private: false,
                            is_me: true,
                            id: null,
                            trainer_name: leaderboard.me.trainer_name,
                            avatar_id: leaderboard.me.avatar_id,
                            friend_code: leaderboard.me.friend_code,
                            displayed_badges: leaderboard.me.displayed_badges,
                          }}
                          unit={unit}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Upcoming */}
            <div className="flex flex-col gap-2">
              <h4 className="font-black tracking-widest uppercase text-[10px] text-pb-ink/60 border-b-2 border-black/10 pb-1">
                Upcoming Events
              </h4>
              {data.upcoming.length === 0 ? (
                <span className="font-black tracking-widest uppercase text-[9px] text-pb-ink/40 text-center py-2">
                  Nothing scheduled yet
                </span>
              ) : (
                data.upcoming.map((event) => <EventListRow key={event.id} event={event} />)
              )}
            </div>

            {/* Past */}
            <div className="flex flex-col gap-2">
              <h4 className="font-black tracking-widest uppercase text-[10px] text-pb-ink/60 border-b-2 border-black/10 pb-1">
                Past Events
              </h4>
              {data.past.length === 0 ? (
                <span className="font-black tracking-widest uppercase text-[9px] text-pb-ink/40 text-center py-2">
                  No past events
                </span>
              ) : (
                data.past.map((event) => <EventListRow key={event.id} event={event} dimmed />)
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
