"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/ui/shimmer";
import RefreshButton from "@/components/profile/RefreshButton";
import { LeaderboardRow, ShimmerRow } from "@/components/profile/LeaderboardRow";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { EVENT_TRACKED_STATS, eventBonuses, tokenLabel } from "@/lib/events-data";
import { getTypeColor, getTypeIconPath } from "@/lib/type-styles";
import { getPokedexSprite } from "@/lib/pokemon";
import { GENERATIONS, getPokemonName, type Generation } from "pokemon-data";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Board, Events, GameEvent } from "api-client";

type Props = {
  /** True while the Events page is the visible page. Drives lazy fetching. */
  active: boolean;
};

function formatDateRange(event: GameEvent): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(event.startsAt).toLocaleDateString("en-US", opts);
  const end = new Date(event.endsAt).toLocaleDateString("en-US", {
    ...opts,
    year: "numeric",
  });
  return `${start} – ${end}`;
}

/** Chunky pill showing one active event bonus (e.g. "2x XP"). */
function BonusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg border-2 border-black bg-pb-accent shadow-[2px_2px_0_black] font-black text-[0.625rem] uppercase tracking-wider text-black">
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
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-bold normal-case tracking-normal text-[0.5625rem] text-white"
      style={{ backgroundColor: color.background, borderColor: color.border }}
    >
      {icon && <img src={icon} alt="" className="w-3 h-3" />}
      {type}
    </span>
  );
}

/** Tracked-stat line with the type icon when the event is type-filtered. */
function TrackedStatLabel({ event }: { event: GameEvent }) {
  const meta = EVENT_TRACKED_STATS[event.trackedStat];
  return (
    <span className="inline-flex items-center gap-1.5 font-black tracking-widest uppercase text-[0.5625rem] text-pb-ink/60">
      Tracking: {meta.label}
      {event.typeFilter && <TypeChip type={event.typeFilter} />}
    </span>
  );
}

/** Small sprite + name pill, used for the spotlight Pokémon. */
function PokemonPill({ pokedex, prefix }: { pokedex: number; prefix?: string }) {
  return (
    <span className="inline-flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-lg border-2 border-black bg-white shadow-[2px_2px_0_black] font-black text-[0.625rem] uppercase tracking-wider text-black">
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
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-black/40 bg-white font-bold normal-case tracking-normal text-[0.5625rem] text-pb-ink">
      Gen {gen} · {GENERATIONS[gen as Generation]?.name}
    </span>
  );
}

/** Spotlight Pokémon and boosted types/generations — what's spawning more while the event runs. */
function SpawnModifiers({ event }: { event: GameEvent }) {
  if (
    event.spotlightPokedex === null &&
    event.boostedTypes.length === 0 &&
    event.boostedGenerations.length === 0
  ) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {event.spotlightPokedex !== null && (
        <PokemonPill pokedex={event.spotlightPokedex} prefix="★ Spotlight: " />
      )}
      {event.boostedTypes.length > 0 && (
        <span className="inline-flex flex-wrap items-center gap-1 font-black tracking-widest uppercase text-[0.5625rem] text-pb-ink/60">
          More common:
          {event.boostedTypes.map((t) => (
            <TypeChip key={t} type={t} />
          ))}
        </span>
      )}
      {event.boostedGenerations.length > 0 && (
        <span className="inline-flex flex-wrap items-center gap-1 font-black tracking-widest uppercase text-[0.5625rem] text-pb-ink/60">
          {event.boostedTypes.length > 0 ? "And from:" : "More common:"}
          {event.boostedGenerations.map((g) => (
            <GenerationChip key={g} gen={g} />
          ))}
        </span>
      )}
    </div>
  );
}

/** Shared progress toward the event's community goal, and what it unlocks. */
function CommunityGoalPanel({ event }: { event: GameEvent }) {
  if (event.communityGoal === null || event.rewardTokenType === null) return null;
  const goal = event.communityGoal;
  const communityProgress = event.communityProgress ?? 0;
  const myProgress = event.myProgress ?? 0;
  const progress = Math.min(communityProgress, goal);
  const pct = Math.round((progress / goal) * 100);
  const reached = event.goalReachedAt !== null;
  const unit = EVENT_TRACKED_STATS[event.trackedStat].unit;
  const reward = tokenLabel(event.rewardTokenType, event.rewardPokedex);

  return (
    <div className="flex flex-col gap-1.5 pt-2 border-t-2 border-black/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-black tracking-widest uppercase text-[0.625rem] text-pb-ink/70">
          Community Goal
        </span>
        <span className="inline-flex items-center gap-1 font-black text-[0.625rem] uppercase tracking-wider text-pb-ink/70">
          Reward:
          {event.rewardTokenType === "species" && event.rewardPokedex !== null && (
            <img
              src={getPokedexSprite(event.rewardPokedex)}
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
      <span className="font-mono tracking-wide text-[0.625rem] text-pb-ink/70">
        {communityProgress.toLocaleString()} / {goal.toLocaleString()} {unit} by all trainers
      </span>
      {reached ? (
        <span className="font-black tracking-widest uppercase text-[0.625rem] text-pb-poppy">
          {myProgress > 0
            ? `Goal reached! Your ${reward} is in Achievements → Unopened Tokens`
            : `Goal reached! Score once before the event ends to get your ${reward}`}
        </span>
      ) : (
        <span className="font-bold text-[0.625rem] text-pb-ink/60">
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
        {event.spotlightPokedex !== null && <PokemonPill pokedex={event.spotlightPokedex} prefix="★ " />}
        {event.boostedTypes.map((t) => (
          <TypeChip key={t} type={t} />
        ))}
        {event.boostedGenerations.map((g) => (
          <GenerationChip key={g} gen={g} />
        ))}
        {eventBonuses(event).map((label) => (
          <BonusPill key={label} label={label} />
        ))}
        {event.communityGoal !== null && event.rewardTokenType !== null && (
          <BonusPill label={`Goal → ${tokenLabel(event.rewardTokenType, event.rewardPokedex)}`} />
        )}
      </div>
      <span className="font-mono tracking-wide text-[0.625rem] text-pb-ink/60 shrink-0">
        {formatDateRange(event)}
      </span>
    </div>
  );
}

// ─── Live event card ──────────────────────────────────────────────────────────

/**
 * One running event: its countdown, modifiers, community goal, the caller's
 * progress, and a lazily-fetched leaderboard. Events can overlap, so the page
 * renders one of these per live event, each with its own leaderboard state.
 */
function LiveEventCard({ event, serverNow }: { event: GameEvent; serverNow: string }) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Board | null>(null);
  const [lbFailed, setLbFailed] = useState(false);
  const [lbFetchToken, setLbFetchToken] = useState(0);

  const endsIn = useCountdown(event.endsAt, serverNow);
  const unit = EVENT_TRACKED_STATS[event.trackedStat].unit;
  const myProgress = event.myProgress ?? 0;
  const bonuses = eventBonuses(event);

  // Fetch the leaderboard the first time it's shown (and again on Retry).
  useEffect(() => {
    if (!showLeaderboard || leaderboard) return;

    let cancelled = false;

    api.eventLeaderboard(event.id)
      .then((res) => {
        if (cancelled) return;
        setLbFailed(false);
        setLeaderboard(res);
      })
      .catch(() => {
        if (cancelled) return;
        setLbFailed(true);
      });

    return () => { cancelled = true; };
  }, [showLeaderboard, leaderboard, event.id, lbFetchToken]);

  // Derived, like the page's own `loading` — see the note there.
  const lbLoading = !leaderboard && !lbFailed;
  const meInTop = leaderboard?.top.some((e) => e.isMe) ?? false;
  const showMeFooter = !!leaderboard?.me && !meInTop;

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-white rounded-xl border-4 border-black shadow-[4px_4px_0_black] p-4 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-emboss-sm text-lg">{event.name.toUpperCase()}</h3>
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg border-2 border-black bg-pb-poppy shadow-[2px_2px_0_black] font-black text-[0.625rem] uppercase tracking-wider text-white">
            Ends in {endsIn ?? "…"}
          </span>
        </div>
        {event.description && (
          <p className="text-sm text-pb-ink/80 font-medium">{event.description}</p>
        )}
        <TrackedStatLabel event={event} />
        <SpawnModifiers event={event} />
        {bonuses.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {bonuses.map((label) => (
              <BonusPill key={label} label={label} />
            ))}
          </div>
        )}
        <CommunityGoalPanel event={event} />
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t-2 border-black/10">
          <span className="font-black tracking-widest uppercase text-[0.625rem] text-pb-primary">
            My progress: {myProgress} {unit}
          </span>
          <Button
            variant="game"
            tone="neutral"
            size="sm"
            className="h-8 px-3 text-[0.5625rem] border-2 shadow-[2px_2px_0_black] [-webkit-text-stroke:0px] [text-shadow:none]"
            aria-pressed={showLeaderboard}
            onClick={() => setShowLeaderboard((v) => !v)}
          >
            {showLeaderboard ? "Hide Leaderboard" : "Show Leaderboard"}
          </Button>
        </div>
      </div>

      {showLeaderboard && (
        <div className="flex flex-col gap-2">
          <h4 className="font-black tracking-widest uppercase text-[0.625rem] text-pb-ink/60">
            {event.name} Leaderboard — {EVENT_TRACKED_STATS[event.trackedStat].label}
          </h4>
          {lbFailed ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <span className="font-black tracking-widest uppercase text-[0.6875rem] text-pb-ink/60 text-center">
                Couldn&apos;t load the leaderboard
              </span>
              <Button
                variant="game"
                tone="neutral"
                size="sm"
                onClick={() => {
                  setLbFailed(false);
                  setLbFetchToken((n) => n + 1);
                }}
              >
                Retry
              </Button>
            </div>
          ) : lbLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => <ShimmerRow key={i} />)}
            </div>
          ) : leaderboard && leaderboard.top.length === 0 ? (
            <span className="font-black tracking-widest uppercase text-[0.625rem] text-pb-ink/40 text-center py-4 leading-relaxed">
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
                  <LeaderboardRow entry={leaderboard.me} unit={unit} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/** Cached event data older than this is refetched when the page is reopened. */
const STALE_MS = 60_000;
/** setTimeout tops out around 24.8 days, so long waits re-arm in chunks. */
const MAX_TIMER_MS = 6 * 60 * 60 * 1000;

export default function EventsPage({ active }: Props) {
  const [data, setData] = useState<Events | null>(null);
  /** When `data` was fetched — a ref so it can't retrigger the fetch effect. */
  const fetchedAtRef = useRef(0);
  const [failed, setFailed] = useState(false);
  const [fetchToken, setFetchToken] = useState(0);
  const [boundaryTick, setBoundaryTick] = useState(0);

  const handleRefetch = useCallback(() => {
    // Clearing data unmounts the live cards, which drops their cached
    // leaderboards along with it.
    setData(null);
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

    api.events()
      .then((res) => {
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

  const live = data?.live ?? [];
  const nextUp = data?.upcoming[0] ?? null;

  // The next moment the live/upcoming split changes: the soonest live event
  // ending, or the next one starting, whichever comes first. Without this the
  // page would keep rendering an event that finished hours ago.
  const boundaryIso =
    [...live.map((e) => e.endsAt), ...(nextUp ? [nextUp.startsAt] : [])]
      .sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;

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

  const nextStartsIn = useCountdown(
    live.length === 0 && nextUp ? nextUp.startsAt : null,
    data?.serverNow ?? null
  );

  // Derived rather than stored: "loading" is exactly "nothing to show and
  // nothing went wrong yet", which keeps the fetch effects free of the
  // synchronous setState that triggers cascading renders.
  const loading = !data && !failed;

  return (
    <Card variant="game" tone="glass" className="h-full w-full p-4 mt-2 overflow-hidden gap-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-emboss text-xl">EVENTS</h2>
        <RefreshButton onRefresh={handleRefetch} refreshing={loading} />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0 flex flex-col gap-4">
        {failed ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <span className="font-black tracking-widest uppercase text-[0.6875rem] text-pb-ink/60 text-center">
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
            {live.length > 0 ? (
              <>
                {live.length > 1 && (
                  <h4 className="font-black tracking-widest uppercase text-[0.625rem] text-pb-ink/60">
                    {live.length} events live now — they all count at once
                  </h4>
                )}
                {live.map((event) => (
                  <LiveEventCard
                    key={event.id}
                    event={event}
                    serverNow={data.serverNow}
                  />
                ))}
              </>
            ) : (
              <div className="bg-white rounded-xl border-4 border-black shadow-[4px_4px_0_black] p-4 flex flex-col items-center gap-2 text-center">
                {nextUp ? (
                  <>
                    <span className="font-black tracking-widest uppercase text-[0.625rem] text-pb-ink/50">
                      No active event
                    </span>
                    <h3 className="text-emboss-sm text-lg">NEXT: {nextUp.name.toUpperCase()}</h3>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg border-2 border-black bg-pb-accent shadow-[2px_2px_0_black] font-black text-[0.625rem] uppercase tracking-wider text-black">
                      Starts in {nextStartsIn ?? "…"}
                    </span>
                  </>
                ) : (
                  <span className="font-black tracking-widest uppercase text-[0.625rem] text-pb-ink/40 leading-relaxed">
                    NO EVENTS SCHEDULED<br />CHECK BACK SOON!
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <h4 className="font-black tracking-widest uppercase text-[0.625rem] text-pb-ink/60 border-b-2 border-black/10 pb-1">
                Upcoming Events
              </h4>
              {data.upcoming.length === 0 ? (
                <span className="font-black tracking-widest uppercase text-[0.5625rem] text-pb-ink/40 text-center py-2">
                  Nothing scheduled yet
                </span>
              ) : (
                data.upcoming.map((event) => <EventListRow key={event.id} event={event} />)
              )}
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="font-black tracking-widest uppercase text-[0.625rem] text-pb-ink/60 border-b-2 border-black/10 pb-1">
                Past Events
              </h4>
              {data.past.length === 0 ? (
                <span className="font-black tracking-widest uppercase text-[0.5625rem] text-pb-ink/40 text-center py-2">
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
