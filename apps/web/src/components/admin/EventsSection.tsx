"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shimmer } from "@/components/ui/shimmer";
import { api } from "@/lib/api";
import { useAdminAction } from "@/components/admin/useAdminAction";
import {
  Field,
  GroupHeading,
  StatusLine,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/primitives";
import {
  EVENT_MULTIPLIERS,
  EVENT_REWARD_TOKEN_TYPES,
  EVENT_TRACKED_STAT_KEYS,
  EVENT_TRACKED_STATS,
  TOKEN_TYPE_LABELS,
  tokenLabel,
} from "@/lib/events-data";
import { POKEMON_TYPES } from "@/lib/type-styles";
import { GENERATIONS, POKEMON, SHIPPED_GENERATIONS, getPokemonName, type Generation } from "pokemon-data";
import { cn } from "@/lib/utils";
import type { GameEvent, PokemonType, TokenType, TrackedStat } from "api-client";

const EMPTY_FORM = {
  name: "",
  description: "",
  startsAt: "",
  endsAt: "",
  trackedStat: "total_catches" as TrackedStat,
  typeFilter: "" as PokemonType | "",
  xpMultiplier: "1",
  candyMultiplier: "1",
  shinyMultiplier: "1",
  spotlightPokedex: "",
  spotlightPercent: "25",
  boostedTypes: [] as PokemonType[],
  typeBoost: "3",
  boostedGenerations: [] as number[],
  generationBoost: "2",
  communityGoal: "",
  rewardTokenType: "species" as TokenType,
  rewardPokedex: "251",
};

const SPECIES = Object.values(POKEMON).sort((a, b) => a.id - b.id);
/** Mythicals never spawn wild, so they can't be spotlighted. */
const SPOTLIGHT_SPECIES = SPECIES.filter((p) => !p.isMythical);

/** One-line summary of an event's spawn modifiers and goal for the schedule list. */
function modifierSummary(event: GameEvent): string {
  const parts: string[] = [];
  if (event.spotlightPokedex !== null && event.spotlightRate !== null) {
    parts.push(`★ ${getPokemonName(event.spotlightPokedex)} ${Math.round(event.spotlightRate * 100)}%`);
  }
  if (event.boostedTypes.length > 0) {
    parts.push(`${event.boostedTypes.join("/")} ×${event.typeBoost}`);
  }
  if (event.boostedGenerations.length > 0) {
    parts.push(`Gen ${event.boostedGenerations.join("/")} ×${event.generationBoost}`);
  }
  if (event.communityGoal !== null && event.rewardTokenType !== null) {
    parts.push(
      `Goal ${(event.communityProgress ?? 0)}/${event.communityGoal} → ${tokenLabel(event.rewardTokenType, event.rewardPokedex)}` +
        (event.goalReachedAt ? " ✓" : "")
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
  if (Date.parse(event.startsAt) > now) return "upcoming";
  if (Date.parse(event.endsAt) <= now) return "past";
  return "live";
}

const PHASE_STYLES: Record<ReturnType<typeof eventPhase>, string> = {
  live: "bg-pb-poppy text-white",
  upcoming: "bg-pb-accent text-black",
  past: "bg-pb-inactive text-black/60",
};

/** Create, edit and delete the event schedule. */
export default function EventsSection() {
  const { busy, status, run } = useAdminAction();
  const [events, setEvents] = useState<GameEvent[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [goalLocked, setGoalLocked] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setEvents(await api.admin.events());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    api.admin.events().then(setEvents, () => setLoadFailed(true));
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setGoalLocked(false);
  };

  const startEdit = (event: GameEvent) => {
    setEditingId(event.id);
    setForm({
      name: event.name,
      description: event.description,
      startsAt: toLocalInputValue(event.startsAt),
      endsAt: toLocalInputValue(event.endsAt),
      trackedStat: event.trackedStat,
      typeFilter: event.typeFilter ?? "",
      xpMultiplier: String(event.xpMultiplier),
      candyMultiplier: String(event.candyMultiplier),
      shinyMultiplier: String(event.shinyMultiplier),
      spotlightPokedex: event.spotlightPokedex === null ? "" : String(event.spotlightPokedex),
      spotlightPercent:
        event.spotlightRate === null ? EMPTY_FORM.spotlightPercent : String(Math.round(event.spotlightRate * 100)),
      boostedTypes: event.boostedTypes,
      typeBoost: event.boostedTypes.length > 0 ? String(event.typeBoost) : EMPTY_FORM.typeBoost,
      boostedGenerations: event.boostedGenerations,
      generationBoost:
        event.boostedGenerations.length > 0 ? String(event.generationBoost) : EMPTY_FORM.generationBoost,
      communityGoal: event.communityGoal === null ? "" : String(event.communityGoal),
      rewardTokenType: event.rewardTokenType ?? EMPTY_FORM.rewardTokenType,
      rewardPokedex:
        event.rewardPokedex === null ? EMPTY_FORM.rewardPokedex : String(event.rewardPokedex),
    });
    setGoalLocked(event.goalReachedAt !== null);
  };

  const submit = () => {
    const payload = {
      name: form.name,
      description: form.description,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : "",
      trackedStat: form.trackedStat,
      typeFilter: form.trackedStat === "type_catches" ? form.typeFilter || null : null,
      xpMultiplier: Number(form.xpMultiplier),
      candyMultiplier: Number(form.candyMultiplier),
      shinyMultiplier: Number(form.shinyMultiplier),
      spotlightPokedex: form.spotlightPokedex ? Number(form.spotlightPokedex) : null,
      spotlightRate: form.spotlightPokedex ? Number(form.spotlightPercent) / 100 : null,
      boostedTypes: form.boostedTypes,
      typeBoost: form.boostedTypes.length > 0 ? Number(form.typeBoost) : 1,
      boostedGenerations: form.boostedGenerations,
      generationBoost: form.boostedGenerations.length > 0 ? Number(form.generationBoost) : 1,
      communityGoal: form.communityGoal ? Number(form.communityGoal) : null,
      rewardTokenType: form.communityGoal ? form.rewardTokenType : null,
      rewardPokedex:
        form.communityGoal && form.rewardTokenType === "species" ? Number(form.rewardPokedex) : null,
    };
    const label = editingId ? "Update event" : "Create event";
    void run(label, async () => {
      if (editingId) {
        await api.admin.updateEvent(editingId, payload);
      } else {
        await api.admin.createEvent(payload);
      }
      resetForm();
      await loadEvents();
    });
  };

  const toggleBoostedType = (type: PokemonType) => {
    const has = form.boostedTypes.includes(type);
    setForm({
      ...form,
      boostedTypes: has ? form.boostedTypes.filter((t) => t !== type) : [...form.boostedTypes, type],
    });
  };

  const toggleBoostedGeneration = (gen: number) => {
    const has = form.boostedGenerations.includes(gen);
    setForm({
      ...form,
      boostedGenerations: has
        ? form.boostedGenerations.filter((g) => g !== gen)
        : [...form.boostedGenerations, gen].sort((a, b) => a - b),
    });
  };

  const remove = (event: GameEvent) =>
    void run("Delete event", async () => {
      await api.admin.deleteEvent(event.id);
      if (editingId === event.id) resetForm();
      await loadEvents();
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <GroupHeading>{editingId ? "Edit Event" : "New Event"}</GroupHeading>

        <div className="flex flex-wrap gap-3">
          <Field label="Name" className="flex-1 min-w-[13.75rem]">
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
                setForm({ ...form, trackedStat: e.target.value as TrackedStat })
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
                onChange={(e) => setForm({ ...form, typeFilter: e.target.value as PokemonType | "" })}
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

        <div className="flex flex-col gap-2">
          <span className="font-black tracking-widest uppercase text-[0.5625rem] text-pb-ink/60">
            Bonuses
            <span className="ml-1.5 normal-case tracking-normal font-bold opacity-70">
              live multipliers while the event runs — 1 means no bonus
            </span>
          </span>
          <div className="flex flex-wrap gap-3">
            {EVENT_MULTIPLIERS.map(({ key, label }) => (
              <Field key={key} label={label} hint="×">
                <Input
                  type="number"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className={`!w-24 ${adminInputClass}`}
                  min={1}
                  step={0.5}
                />
              </Field>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-black tracking-widest uppercase text-[0.5625rem] text-pb-ink/60">
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
              <Field label="Share of spawns" hint="%">
                <Input
                  type="number"
                  value={form.spotlightPercent}
                  onChange={(e) => setForm({ ...form, spotlightPercent: e.target.value })}
                  className={`!w-24 ${adminInputClass}`}
                  min={1}
                  step={1}
                />
              </Field>
            )}
          </div>
          <Field label="Boosted types">
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
                      "px-2 py-0.5 rounded border-2 font-bold text-[0.625rem] uppercase tracking-wide",
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
            <Field label="Boost" hint="spawn weight ×">
              <Input
                type="number"
                value={form.typeBoost}
                onChange={(e) => setForm({ ...form, typeBoost: e.target.value })}
                className={`!w-24 ${adminInputClass}`}
                min={1}
                max={20}
                step={0.5}
              />
            </Field>
          )}
          <Field label="Boosted generations" hint="multiplies with the type boost">
            <div className="flex flex-wrap gap-1.5">
              {SHIPPED_GENERATIONS.map((g) => {
                const on = form.boostedGenerations.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleBoostedGeneration(g)}
                    className={cn(
                      "px-2 py-0.5 rounded border-2 font-bold text-[0.625rem] uppercase tracking-wide",
                      on ? "bg-pb-primary text-white border-black" : "bg-white text-pb-ink/70 border-black/15"
                    )}
                  >
                    Gen {g} · {GENERATIONS[g as Generation].name}
                  </button>
                );
              })}
            </div>
          </Field>
          {form.boostedGenerations.length > 0 && (
            <Field label="Generation boost" hint="spawn weight ×">
              <Input
                type="number"
                value={form.generationBoost}
                onChange={(e) => setForm({ ...form, generationBoost: e.target.value })}
                className={`!w-24 ${adminInputClass}`}
                min={1}
                max={20}
                step={0.5}
              />
            </Field>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-black tracking-widest uppercase text-[0.5625rem] text-pb-ink/60">
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
                    setForm({ ...form, rewardTokenType: e.target.value as TokenType })
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
          Events can overlap: each scores on its own, spotlights share the spotlight slot
          (capped at 90%), type and generation boosts multiply, and the strongest XP / candy /
          shiny bonus wins. Changing an
          event&apos;s tracked stat or type filter resets its leaderboard and goal progress.
          Once a community goal is reached, its scoring and reward are locked.
        </p>
      </div>

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
          <span className="font-black tracking-widest uppercase text-[0.5625rem] text-pb-ink/40 py-2">
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
                    "px-2 py-0.5 rounded border-2 border-black font-black text-[0.5625rem] uppercase tracking-wider shrink-0",
                    PHASE_STYLES[phase]
                  )}
                >
                  {phase}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-pb-ink truncate">{event.name}</p>
                  <p className="font-mono text-[0.625rem] text-pb-ink/60 truncate">
                    {EVENT_TRACKED_STATS[event.trackedStat].label}
                    {event.typeFilter && ` · ${event.typeFilter}`}
                    {" · "}
                    {new Date(event.startsAt).toLocaleString()} →{" "}
                    {new Date(event.endsAt).toLocaleString()}
                  </p>
                  {modifierSummary(event) && (
                    <p className="font-mono text-[0.625rem] text-pb-primary truncate">
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
