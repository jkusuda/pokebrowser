"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACHIEVEMENTS } from "@/lib/achievements-data";
import { POKEMON_TYPES } from "@/lib/types";
import { POKEMON, getPokemonName } from "pokemon-data";
import { postJson } from "@/lib/client-api";
import { useAdminAction } from "@/components/admin/useAdminAction";
import {
  Field,
  GroupHeading,
  StatusLine,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/primitives";

const TOKEN_TYPES = ["legendary", "mythical", "shiny", "type_pick", "species"] as const;
const SPECIES = Object.values(POKEMON).sort((a, b) => a.id - b.id);

/**
 * Grants tokens / XP / achievement unlocks to the signed-in admin's own
 * account, for exercising reward flows without grinding the real conditions.
 */
export default function PlayerToolsSection() {
  const { busy, status, run } = useAdminAction();
  const [tokenType, setTokenType] = useState<(typeof TOKEN_TYPES)[number]>("legendary");
  const [typeFilter, setTypeFilter] = useState("");
  const [pokedexNumber, setPokedexNumber] = useState("251");
  const [xpAmount, setXpAmount] = useState("1000");
  const [achievementId, setAchievementId] = useState(ACHIEVEMENTS[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-pb-ink/70 font-medium">
        These act on <strong>your own account</strong>. They bypass the real trigger
        conditions, so use them to test reward flows — not to award anything you want to
        keep.
      </p>

      {/* Grant token */}
      <div className="flex flex-col gap-2">
        <GroupHeading>Grant Token</GroupHeading>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Token type">
            <select
              value={tokenType}
              onChange={(e) => setTokenType(e.target.value as (typeof TOKEN_TYPES)[number])}
              className={adminSelectClass}
            >
              {TOKEN_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          {tokenType === "type_pick" && (
            <Field label="Type filter" hint="(leave unset to test the picker)">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={adminSelectClass}
              >
                <option value="">— unset —</option>
                {POKEMON_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
          )}
          {tokenType === "species" && (
            <Field label="Pokémon">
              <select
                value={pokedexNumber}
                onChange={(e) => setPokedexNumber(e.target.value)}
                className={adminSelectClass}
              >
                {SPECIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} {getPokemonName(p.id)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Button
            variant="game"
            tone="primary"
            size="sm"
            disabled={busy}
            onClick={() =>
              run("Grant token", () =>
                postJson("/api/admin/grant-token", {
                  tokenType,
                  typeFilter: tokenType === "type_pick" && typeFilter ? typeFilter : null,
                  pokedexNumber: tokenType === "species" ? Number(pokedexNumber) : null,
                })
              )
            }
          >
            Grant
          </Button>
        </div>
      </div>

      {/* Add XP */}
      <div className="flex flex-col gap-2">
        <GroupHeading>Add XP</GroupHeading>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Amount" hint="1–1,000,000">
            <Input
              type="number"
              value={xpAmount}
              onChange={(e) => setXpAmount(e.target.value)}
              className={`!w-32 ${adminInputClass}`}
              min={1}
              max={1_000_000}
            />
          </Field>
          <Button
            variant="game"
            tone="primary"
            size="sm"
            disabled={busy}
            onClick={() =>
              run("Add XP", () => postJson("/api/admin/add-xp", { amount: Number(xpAmount) }))
            }
          >
            Add
          </Button>
        </div>
      </div>

      {/* Force-unlock achievement */}
      <div className="flex flex-col gap-2">
        <GroupHeading>Force-Unlock Achievement</GroupHeading>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Achievement">
            <select
              value={achievementId}
              onChange={(e) => setAchievementId(e.target.value)}
              className={`${adminSelectClass} max-w-[260px]`}
            >
              {ACHIEVEMENTS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </Field>
          <Button
            variant="game"
            tone="primary"
            size="sm"
            disabled={busy}
            onClick={() =>
              run("Unlock achievement", () =>
                postJson("/api/admin/unlock-achievement", { achievementId })
              )
            }
          >
            Unlock
          </Button>
        </div>
        <p className="text-xs text-pb-ink/60 font-medium">
          Unlocking here grants no storage or token reward — claim it from the Achievements
          tab to exercise that path for real.
        </p>
      </div>

      <StatusLine status={status} />
    </div>
  );
}
