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
} from "@/lib/events-data";
import { POKEMON_TYPES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EventBonus, EventTrackedStat, GameEvent } from "@/types";

type BonusDraft = { type: EventBonus["type"]; value: string; label: string };

const EMPTY_FORM = {
  name: "",
  description: "",
  startsAt: "",
  endsAt: "",
  trackedStat: "total_catches" as EventTrackedStat,
  typeFilter: "",
};

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
    });
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
          event&apos;s tracked stat or type filter resets its leaderboard.
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
