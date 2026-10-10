"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shimmer } from "@/components/ui/shimmer";
import { postJson } from "@/lib/client-api";
import { useAdminAction } from "@/components/admin/useAdminAction";
import {
  Field,
  GroupHeading,
  StatusLine,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/primitives";
import {
  EVENT_TRACKED_STATS,
  EVENT_TRACKED_STAT_KEYS,
  EVENT_BONUS_TYPES,
  EVENT_BONUS_TYPE_LABELS,
  MAX_BONUS_VALUE,
  EVENT_REWARD_TOKEN_TYPES,
  TOKEN_TYPE_LABELS,
  MAX_SPOTLIGHT_RATE,
  MAX_TYPE_BOOST,
  MAX_BOOSTED_TYPES,
  tokenLabel,
} from "@/lib/events-data";
import { POKEMON_TYPES } from "@/lib/types";
import { POKEMON, getPokemonName } from "pokemon-data";
import { cn } from "@/lib/utils";
import { EventBonus, EventRewardTokenType, EventTrackedStat, GameEvent } from "@/types";

type BonusDraft = { type: EventBonus["type"]; value: string; label: string };

const EMPTY_FORM = {
  name: "",
  description: "",
  startsAt: "",
  endsAt: "",
  trackedStat: "total_catches" as EventTrackedStat,
  typeFilter: "",
  // Spawns — empty spotlight / no boosted types means "off".
  spotlightPokedex: "",
  spotlightPercent: "25",
  boostedTypes: [] as string[],
  typeBoost: "3",
  // Community goal — empty goal means "off".
  communityGoal: "",
  rewardTokenType: "species" as EventRewardTokenType,
  rewardPokedex: "251",
};

const SPECIES = Object.values(POKEMON).sort((a, b) => a.id - b.id);
/** Mythicals never spawn wild, so they can't be spotlighted (the DB enforces this too). */
const SPOTLIGHT_SPECIES = SPECIES.filter((p) => !p.isMythical);

/** One-line summary of an event's spawn modifiers and goal for the schedule list. */
function modifierSummary(event: GameEvent): string {
  const parts: string[] = [];
  if (event.spotlight_pokedex !== null && event.spotlight_rate !== null) {
    parts.push(`★ ${getPokemonName(event.spotlight_pokedex)} ${Math.round(event.spotlight_rate * 100)}%`);
  }
  if (event.boosted_types.length > 0) {
    parts.push(`${event.boosted_types.join("/")} ×${event.type_boost}`);
  }
  if (event.community_goal !== null && event.reward_token_type !== null) {
    parts.push(
      `Goal ${event.community_progress}/${event.community_goal} → ${tokenLabel(event.reward_token_type, event.reward_pokedex)}` +
        (event.goal_reached_at ? " ✓" : "")
    );
  }
  return parts.join(" · ");
}

/** ISO timestamptz → value accepted by <input type="datetime-local"> (local time). */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function eventPhase(event: GameEvent): "live" | "upcoming" | "past" {
  const now = Date.now();
  if (Date.parse(event.starts_at) > now) return "upcoming";
  if (Date.parse(event.ends_at) <= now) return "past";
  return "live";
}

const PHASE_STYLES: Record<ReturnType<typeof eventPhase>, string> = {
  live: "bg-pb-poppy text-white",
  upcoming: "bg-pb-accent text-black",
  past: "bg-pb-inactive text-black/60",
};

/** Create, edit and delete the event schedule. Writes go through the admin-gated RPCs. */
export default function EventsSection() {
  const { busy, status, run } = useAdminAction();
  const [events, setEvents] = useState<GameEvent[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [bonuses, setBonuses] = useState<BonusDraft[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  // The edited event's goal was already reached — its scoring and reward are locked server-side.
  const [goalLocked, setGoalLocked] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoadFailed(false);
    try {
      const res = await fetch("/api/admin/events");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { events: GameEvent[] };
      setEvents(json.events);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setBonuses([]);
    setEditingId(null);
    setGoalLocked(false);
  };

  const startEdit = (event: GameEvent) => {
    setEditingId(event.id);
    setForm({
      name: event.name,
      description: event.description,
      startsAt: toLocalInputValue(event.starts_at),
      endsAt: toLocalInputValue(event.ends_at),
      trackedStat: event.tracked_stat,
      typeFilter: event.type_filter ?? "",
      spotlightPokedex: event.spotlight_pokedex === null ? "" : String(event.spotlight_pokedex),
      spotlightPercent:
        event.spotlight_rate === null ? EMPTY_FORM.spotlightPercent : String(Math.round(event.spotlight_rate * 100)),
      boostedTypes: event.boosted_types,
      typeBoost: event.boosted_types.length > 0 ? String(event.type_boost) : EMPTY_FORM.typeBoost,
      communityGoal: event.community_goal === null ? "" : String(event.community_goal),
      rewardTokenType: event.reward_token_type ?? EMPTY_FORM.rewardTokenType,
      rewardPokedex:
        event.reward_pokedex === null ? EMPTY_FORM.rewardPokedex : String(event.reward_pokedex),
    });
    setGoalLocked(event.goal_reached_at !== null);
    setBonuses(event.bonuses.map((b) => ({ type: b.type, value: String(b.value), label: b.label })));
  };

  const submit = () => {
    const payload = {
      name: form.name,
      description: form.description,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : "",
      trackedStat: form.trackedStat,
      typeFilter: form.trackedStat === "type_catches" ? form.typeFilter || null : null,
      bonuses: bonuses.map((b) => ({ type: b.type, value: Number(b.value), label: b.label })),
      spotlightPokedex: form.spotlightPokedex ? Number(form.spotlightPokedex) : null,
      spotlightRate: form.spotlightPokedex ? Number(form.spotlightPercent) / 100 : null,
      boostedTypes: form.boostedTypes,
      typeBoost: form.boostedTypes.length > 0 ? Number(form.typeBoost) : 1,
      communityGoal: form.communityGoal ? Number(form.communityGoal) : null,
      rewardTokenType: form.communityGoal ? form.rewardTokenType : null,
      rewardPokedex:
        form.communityGoal && form.rewardTokenType === "species" ? Number(form.rewardPokedex) : null,
    };
    const label = editingId ? "Update event" : "Create event";
    void run(label, async () => {
      if (editingId) {
        await postJson("/api/admin/events/update", { eventId: editingId, ...payload });
      } else {
        await postJson("/api/admin/events", payload);
      }
      resetForm();
      await loadEvents();
    });
  };

  const toggleBoostedType = (type: string) => {
    const has = form.boostedTypes.includes(type);
    if (!has && form.boostedTypes.length >= MAX_BOOSTED_TYPES) return;
    setForm({
      ...form,
      boostedTypes: has ? form.boostedTypes.filter((t) => t !== type) : [...form.boostedTypes, type],
    });
  };

  const remove = (event: GameEvent) =>
    void run("Delete event", async () => {
      await postJson("/api/admin/events/delete", { eventId: event.id });
      if (editingId === event.id) resetForm();
      await loadEvents();
    });

  return (
    <div className="flex flex-col gap-5">
      {/* ── Create / edit ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <GroupHeading>{editingId ? "Edit Event" : "New Event"}</GroupHeading>

        <div className="flex flex-wrap gap-3">
          <Field label="Name" className="flex-1 min-w-[220px]">
            <Input
              placeholder="Shiny Weekend"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={adminInputClass}
              maxLength={60}
            />
          </Field>
          <Field label="Tracked stat">
            <select
              value={form.trackedStat}
              onChange={(e) =>
                setForm({ ...form, trackedStat: e.target.value as EventTrackedStat })
              }
              className={adminSelectClass}
              disabled={goalLocked}
            >
              {EVENT_TRACKED_STAT_KEYS.map((key) => (
                <option key={key} value={key}>{EVENT_TRACKED_STATS[key].label}</option>
              ))}
            </select>
          </Field>
          {form.trackedStat === "type_catches" && (
            <Field label="Type filter" hint="required">
              <select
                value={form.typeFilter}
                onChange={(e) => setForm({ ...form, typeFilter: e.target.value })}
                className={adminSelectClass}
                disabled={goalLocked}
              >
                <option value="">— pick a type —</option>
                {POKEMON_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <Field label="Description">
          <Input
            placeholder="Catch as many Pokémon as you can!"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={adminInputClass}
            maxLength={500}
          />
        </Field>

        <div className="flex flex-wrap gap-3">
          <Field label="Starts" hint="your local time">
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className={adminSelectClass}
            />
          </Field>
          <Field label="Ends" hint="your local time">
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className={adminSelectClass}
            />
          </Field>
        </div>

        {/* Bonuses */}
        <div className="flex flex-col gap-2">
          <span className="font-black tracking-widest uppercase text-[9px] text-pb-ink/60">
            Bonuses
            <span className="ml-1.5 normal-case tracking-normal font-bold opacity-70">
              live multipliers while the event runs — the label is what players see
            </span>
          </span>
          {bonuses.map((bonus, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select
                value={bonus.type}
                onChange={(e) => {
                  const next = [...bonuses];
                  next[i] = { ...bonus, type: e.target.value as EventBonus["type"] };
                  setBonuses(next);
                }}
                className={adminSelectClass}
              >
                {EVENT_BONUS_TYPES.map((t) => (
                  <option key={t} value={t}>{EVENT_BONUS_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <Input
                type="number"
                placeholder="2"
                value={bonus.value}
                onChange={(e) => {
                  const next = [...bonuses];
                  next[i] = { ...bonus, value: e.target.value };
                  setBonuses(next);
                }}
                className={`!w-24 ${adminInputClass}`}
                min={0}
                max={MAX_BONUS_VALUE}
                step={0.5}
              />
              <Input
                placeholder="Label (e.g. 2x XP)"
                value={bonus.label}
                onChange={(e) => {
                  const next = [...bonuses];
                  next[i] = { ...bonus, label: e.target.value };
                  setBonuses(next);
                }}
                className={`!w-44 ${adminInputClass}`}
                maxLength={30}
              />
              <Button
                variant="game"
                tone="danger"
                size="sm"
                onClick={() => setBonuses(bonuses.filter((_, j) => j !== i))}
                aria-label="Remove bonus"
              >
                ✕
              </Button>
            </div>
          ))}
          <div>
            <Button
              variant="game"
              tone="neutral"
              size="sm"
              onClick={() =>
                setBonuses([...bonuses, { type: "xp_multiplier", value: "2", label: "2x XP" }])
              }
            >
              + Bonus
            </Button>
          </div>
        </div>


        {/* Spawns */}
        <div className="flex flex-col gap-2">
          <span className="font-black tracking-widest uppercase text-[9px] text-pb-ink/60">
            Spawns
            <span className="ml-1.5 normal-case tracking-normal font-bold opacity-70">
              change what appears in the wild while the event runs
            </span>
          </span>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Spotlight Pokémon" hint="mythicals can't spawn wild">
              <select
                value={form.spotlightPokedex}
                onChange={(e) => setForm({ ...form, spotlightPokedex: e.target.value })}
                className={adminSelectClass}
              >
                <option value="">— none —</option>
                {SPOTLIGHT_SPECIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} {getPokemonName(p.id)}
                  </option>
                ))}
              </select>
            </Field>
            {form.spotlightPokedex && (
              <Field label="Share of spawns" hint={`%, max ${MAX_SPOTLIGHT_RATE * 100}`}>
                <Input
                  type="number"
                  value={form.spotlightPercent}
                  onChange={(e) => setForm({ ...form, spotlightPercent: e.target.value })}
                  className={`!w-24 ${adminInputClass}`}
                  min={1}
                  max={MAX_SPOTLIGHT_RATE * 100}
                  step={1}
                />
              </Field>
            )}
          </div>
          <Field label="Boosted types" hint={`up to ${MAX_BOOSTED_TYPES}`}>
            <div className="flex flex-wrap gap-1.5">
              {POKEMON_TYPES.map((t) => {
                const on = form.boostedTypes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleBoostedType(t)}
                    className={cn(
                      "px-2 py-0.5 rounded border-2 font-bold text-[10px] uppercase tracking-wide",
                      on ? "bg-pb-primary text-white border-black" : "bg-white text-pb-ink/70 border-black/15"
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>
          {form.boostedTypes.length > 0 && (
            <Field label="Boost" hint={`spawn weight ×, max ${MAX_TYPE_BOOST}`}>
              <Input
                type="number"
                value={form.typeBoost}
                onChange={(e) => setForm({ ...form, typeBoost: e.target.value })}
                className={`!w-24 ${adminInputClass}`}
                min={1.5}
                max={MAX_TYPE_BOOST}
                step={0.5}
              />
            </Field>
          )}
        </div>

        {/* Community goal */}
        <div className="flex flex-col gap-2">
          <span className="font-black tracking-widest uppercase text-[9px] text-pb-ink/60">
            Community Goal
            <span className="ml-1.5 normal-case tracking-normal font-bold opacity-70">
              everyone&apos;s tracked-stat scores added up — every participant gets the reward token
            </span>
          </span>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Goal" hint="blank = no goal">
              <Input
                type="number"
                placeholder="1000"
                value={form.communityGoal}
                onChange={(e) => setForm({ ...form, communityGoal: e.target.value })}
                className={`!w-28 ${adminInputClass}`}
                min={1}
                step={1}
                disabled={goalLocked}
              />
            </Field>
            {form.communityGoal && (
              <Field label="Reward">
                <select
                  value={form.rewardTokenType}
                  onChange={(e) =>
                    setForm({ ...form, rewardTokenType: e.target.value as EventRewardTokenType })
                  }
                  className={adminSelectClass}
                  disabled={goalLocked}
                >
                  {EVENT_REWARD_TOKEN_TYPES.map((t) => (
                    <option key={t} value={t}>{TOKEN_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </Field>
            )}
            {form.communityGoal && form.rewardTokenType === "species" && (
              <Field label="Reward Pokémon">
                <select
                  value={form.rewardPokedex}
                  onChange={(e) => setForm({ ...form, rewardPokedex: e.target.value })}
                  className={adminSelectClass}
                  disabled={goalLocked}
                >
                  {SPECIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} {getPokemonName(p.id)}
                      {p.isMythical ? " (mythical)" : p.isLegendary ? " (legendary)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          {goalLocked && (
            <p className="text-xs text-pb-poppy font-bold">
              This event&apos;s goal was reached and rewards were handed out — its tracked stat,
              goal and reward are locked.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="game" tone="primary" size="sm" disabled={busy} onClick={submit}>
            {editingId ? "Save Changes" : "Create Event"}
          </Button>
          {editingId && (
            <Button variant="game" tone="neutral" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>

        <StatusLine status={status} />
        <p className="text-xs text-pb-ink/60 font-medium">
          Events can&apos;t overlap — one at a time, enforced by the database. Changing an
          event&apos;s tracked stat or type filter resets its leaderboard and goal progress.
          Once a community goal is reached, its scoring and reward are locked.
        </p>
      </div>

      {/* ── Schedule ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <GroupHeading>Schedule</GroupHeading>
        {loadFailed ? (
          <div className="flex items-center gap-3 py-2">
            <span className="font-bold text-xs text-pb-poppy">Couldn&apos;t load events</span>
            <Button variant="game" tone="neutral" size="sm" onClick={() => void loadEvents()}>
              Retry
            </Button>
          </div>
        ) : !events ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Shimmer key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <span className="font-black tracking-widest uppercase text-[9px] text-pb-ink/40 py-2">
            No events scheduled
          </span>
        ) : (
          events.map((event) => {
            const phase = eventPhase(event);
            return (
              <div
                key={event.id}
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-1 p-2.5 bg-white rounded-xl border-2",
                  editingId === event.id ? "border-pb-primary" : "border-black/15"
                )}
              >
                <span
                  className={cn(
                    "px-2 py-0.5 rounded border-2 border-black font-black text-[9px] uppercase tracking-wider shrink-0",
                    PHASE_STYLES[phase]
                  )}
                >
                  {phase}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-pb-ink truncate">{event.name}</p>
                  <p className="font-mono text-[10px] text-pb-ink/60 truncate">
                    {EVENT_TRACKED_STATS[event.tracked_stat].label}
                    {event.type_filter && ` · ${event.type_filter}`}
                    {" · "}
                    {new Date(event.starts_at).toLocaleString()} →{" "}
                    {new Date(event.ends_at).toLocaleString()}
                  </p>
                  {modifierSummary(event) && (
                    <p className="font-mono text-[10px] text-pb-primary truncate">
                      {modifierSummary(event)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="game"
                    tone="neutral"
                    size="sm"
                    disabled={busy}
                    onClick={() => startEdit(event)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="game"
                    tone="danger"
                    size="sm"
                    disabled={busy}
                    onClick={() => remove(event)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
