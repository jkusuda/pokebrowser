"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACHIEVEMENTS } from "@/lib/achievements-data";
import { GEN1_TYPES } from "@/lib/types";
import { useRefresh } from "@/lib/hooks/useRefresh";

const TOKEN_TYPES = ["legendary", "mythical", "shiny", "type_pick"] as const;

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

/** Admin-only, NODE_ENV-gated testing tools — grant tokens, add XP, force-unlock achievements. */
export default function DevToolsPanel() {
  const { refresh } = useRefresh();
  const [tokenType, setTokenType] = useState<(typeof TOKEN_TYPES)[number]>("legendary");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [xpAmount, setXpAmount] = useState("1000");
  const [achievementId, setAchievementId] = useState(ACHIEVEMENTS[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(true);
    setStatus(null);
    try {
      await action();
      setStatus(`${label} succeeded`);
      refresh();
    } catch (err) {
      setStatus(`${label} failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-amber-100 border-2 border-dashed border-amber-600 rounded-lg p-3 space-y-3">
      <h3 className="font-black text-xs uppercase tracking-widest text-amber-800">
        🛠 Dev Tools (local only)
      </h3>

      {/* Grant token */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={tokenType}
          onChange={(e) => setTokenType(e.target.value as (typeof TOKEN_TYPES)[number])}
          className="px-2 py-1.5 rounded border-2 border-black bg-white text-xs font-bold"
        >
          {TOKEN_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {tokenType === "type_pick" && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1.5 rounded border-2 border-black bg-white text-xs font-bold"
          >
            <option value="">(unset — test Choose Type)</option>
            {GEN1_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        <Button
          variant="game"
          tone="neutral"
          size="sm"
          disabled={busy}
          onClick={() =>
            run("Grant token", () =>
              postJson("/api/dev/grant-token", {
                tokenType,
                typeFilter: tokenType === "type_pick" && typeFilter ? typeFilter : null,
              })
            )
          }
        >
          Grant Token
        </Button>
      </div>

      {/* Add XP */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          value={xpAmount}
          onChange={(e) => setXpAmount(e.target.value)}
          className="!w-28 !py-1.5 !px-2 !rounded !border-2 text-xs"
          min={1}
          max={1_000_000}
        />
        <Button
          variant="game"
          tone="neutral"
          size="sm"
          disabled={busy}
          onClick={() =>
            run("Add XP", () => postJson("/api/dev/add-xp", { amount: Number(xpAmount) }))
          }
        >
          Add XP
        </Button>
      </div>

      {/* Force-unlock achievement */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={achievementId}
          onChange={(e) => setAchievementId(e.target.value)}
          className="px-2 py-1.5 rounded border-2 border-black bg-white text-xs font-bold max-w-[200px]"
        >
          {ACHIEVEMENTS.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
        <Button
          variant="game"
          tone="neutral"
          size="sm"
          disabled={busy}
          onClick={() =>
            run("Unlock achievement", () =>
              postJson("/api/dev/unlock-achievement", { achievementId })
            )
          }
        >
          Force Unlock
        </Button>
      </div>

      {status && <p className="text-xs font-bold text-amber-900">{status}</p>}
    </div>
  );
}
