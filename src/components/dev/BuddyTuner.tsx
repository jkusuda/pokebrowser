"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BadgeStrip from "@/components/profile/BadgeStrip";
import BuddyIndicator from "@/components/profile/BuddyIndicator";
import BuddySpriteArea from "@/components/profile/BuddySpriteArea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BUDDY_OVERRIDES,
  BUDDY_EDGE_PX,
  BUDDY_GROUND_PX,
  type BuddyOverride,
} from "@/lib/buddy-overrides";
import {
  getBuddySpriteLayout,
  getPokedexSprite,
  getPokemonData,
  getPokemonName,
} from "@/lib/pokemon";
import { POKEDEX_SIZE } from "pokemon-data";
import { THEMES, type ThemeId } from "@/lib/themes";
import { cn } from "@/lib/utils";
import route101 from "@/assets/route101.webp";
import themeBackground2 from "@/assets/theme_background_2.webp";

const DEX_IDS = Array.from({ length: POKEDEX_SIZE }, (_, i) => i + 1);

/** A fully-specified override — the tuner always has concrete values to slide. */
type Draft = Required<BuddyOverride>;

const NEUTRAL: Draft = { scale: 1, dx: 0, dy: 0 };

/** What `buddy-overrides.ts` currently ships for this Pokémon. */
function committedDraft(dex: number): Draft {
  const o = BUDDY_OVERRIDES[dex] ?? {};
  return { scale: o.scale ?? 1, dx: o.dx ?? 0, dy: o.dy ?? 0 };
}

function sameDraft(a: Draft, b: Draft) {
  return a.scale === b.scale && a.dx === b.dx && a.dy === b.dy;
}

/**
 * The line to paste into `BUDDY_OVERRIDES`, omitting any field still at its
 * default. Returns "" when nothing differs — that entry should be deleted, not
 * written as an empty object.
 */
function formatLine(dex: number, d: Draft): string {
  const parts: string[] = [];
  if (d.scale !== 1) parts.push(`scale: ${Number(d.scale.toFixed(2))}`);
  if (d.dx !== 0) parts.push(`dx: ${d.dx}`);
  if (d.dy !== 0) parts.push(`dy: ${d.dy}`);
  if (parts.length === 0) return "";
  return `${dex}: { ${parts.join(", ")} },  // ${getPokemonName(dex).toLowerCase()}`;
}

export default function BuddyTuner() {
  const [dex, setDex] = useState(1);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [isShiny, setIsShiny] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [widthMode, setWidthMode] = useState<"fluid" | "narrow" | "wide">("fluid");
  const [theme, setTheme] = useState<ThemeId>("green");
  const [avatarId, setAvatarId] = useState("red");
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const draft = drafts[dex] ?? committedDraft(dex);

  const setField = useCallback(
    (key: keyof Draft, value: number) => {
      setDrafts((prev) => ({
        ...prev,
        [dex]: { ...(prev[dex] ?? committedDraft(dex)), [key]: value },
      }));
    },
    [dex],
  );

  const nudge = useCallback(
    (key: "dx" | "dy", delta: number) => {
      setDrafts((prev) => {
        const cur = prev[dex] ?? committedDraft(dex);
        return { ...prev, [dex]: { ...cur, [key]: cur[key] + delta } };
      });
    },
    [dex],
  );

  // `[` / `]` step through the dex; arrows nudge position (shift = ×10). Skipped
  // while a form control has focus so typing in the number inputs still works.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const step = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case "[": setDex((d) => Math.max(1, d - 1)); break;
        case "]": setDex((d) => Math.min(POKEDEX_SIZE, d + 1)); break;
        case "ArrowLeft": nudge("dx", -step); break;
        case "ArrowRight": nudge("dx", step); break;
        case "ArrowUp": nudge("dy", step); break;
        case "ArrowDown": nudge("dy", -step); break;
        default: return;
      }
      e.preventDefault();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nudge]);

  const isModified = useCallback(
    (d: number) => {
      const entry = drafts[d];
      return entry !== undefined && !sameDraft(entry, committedDraft(d));
    },
    [drafts],
  );

  const modifiedDexes = useMemo(
    () => Object.keys(drafts).map(Number).filter(isModified).sort((a, b) => a - b),
    [drafts, isModified],
  );

  const visibleDexes = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return DEX_IDS;
    return DEX_IDS.filter(
      (d) => String(d) === q || getPokemonName(d).toLowerCase().includes(q),
    );
  }, [filter]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied("clipboard blocked — select the text manually");
    }
  }

  const line = formatLine(dex, draft);
  const layout = getBuddySpriteLayout(dex, draft);
  const heightMetres = getPokemonData(dex)?.height ?? 0;
  const background = theme === "blue" ? themeBackground2 : route101;

  const cardColClass =
    widthMode === "narrow" ? "w-[320px]"
    : widthMode === "wide" ? "w-[400px]"
    : "w-1/3 min-w-[320px] max-w-[400px]";

  return (
    <div
      data-theme={theme}
      className="h-screen w-screen overflow-hidden bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${background.src})` }}
    >
      <div className="absolute inset-0 bg-white/20 pointer-events-none z-0 mix-blend-overlay" />

      <div className="relative z-10 h-full flex gap-6 p-6 min-h-0">
        {/* Card column — same classes ProfileContent gives the trainer card, so
            resizing the window hits the same breakpoints /profile does. */}
        <div className={cn("flex flex-col shrink-0", cardColClass)}>
          <Card variant="game" tone="grass" className="relative h-full p-4 gap-0">
            <div className="flex justify-center mb-3 px-2">
              <h1 className="text-emboss text-xl text-center">BUDDY TUNER</h1>
            </div>

            <div className="flex-1 bg-pb-bg rounded-[8px] border-4 border-black relative flex flex-col shadow-inner overflow-hidden">
              <BadgeStrip badgeIds={["level_10", "lucky_color", "gotta_catch_em_all"]} />
              <BuddyIndicator pokedexNumber={dex} nickname={null} />

              <div className="flex-1 relative flex flex-col min-h-0">
                <BuddySpriteArea
                  avatarId={avatarId}
                  avatarAlt="Tuner avatar"
                  buddy={{ pokedexNumber: dex, isShiny, nickname: null }}
                  overrideDraft={draft}
                />
                {showGuide && (
                  <>
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-40"
                      style={{ bottom: BUDDY_GROUND_PX, borderTop: "2px dashed #c0392b" }}
                    />
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 z-40"
                      style={{ left: BUDDY_EDGE_PX, borderLeft: "2px dashed #c0392b" }}
                    />
                  </>
                )}
              </div>

              {/* Stand-in for the level/XP bar — context only, not interactive. */}
              <div className="absolute bottom-4 left-4 right-4 h-14 flex items-center gap-3 z-30 pointer-events-none opacity-60">
                <div className="flex flex-col items-center justify-center w-14 h-14 bg-white rounded-[8px] border-4 border-black shadow-[2px_2px_0_black] shrink-0">
                  <span className="font-bold text-[9px] text-black leading-none mt-1">LEVEL</span>
                  <span className="font-black text-xl text-black leading-none mt-0.5">50</span>
                </div>
                <div className="flex-1 h-4 bg-white border-[3px] border-black rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-pb-primary" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0 bg-white/90 border-4 border-black rounded-[10px] p-4 overflow-y-auto custom-scrollbar">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="font-black uppercase tracking-widest text-sm text-pb-ink">
              #{dex} {getPokemonName(dex)}
              <span className="ml-2 font-bold normal-case tracking-normal text-xs opacity-60">
                {heightMetres} m
                {BUDDY_OVERRIDES[dex] ? " · has committed override" : " · no override"}
                {isModified(dex) ? " · modified" : ""}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="game" tone="neutral" size="sm" onClick={() => setDex((d) => Math.max(1, d - 1))}>
                ← prev [
              </Button>
              <Button variant="game" tone="neutral" size="sm" onClick={() => setDex((d) => Math.min(POKEDEX_SIZE, d + 1))}>
                ] next →
              </Button>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-2">
            <SliderRow label="scale" value={draft.scale} min={0.1} max={3} step={0.01}
              onChange={(v) => setField("scale", v)} />
            <SliderRow label="dx" value={draft.dx} min={-150} max={150} step={1}
              onChange={(v) => setField("dx", v)} />
            <SliderRow label="dy" value={draft.dy} min={-150} max={150} step={1}
              onChange={(v) => setField("dy", v)} />
            <p className="text-[11px] font-bold text-pb-ink/60">
              Arrow keys nudge dx/dy by 1, shift+arrow by 10. Computed: height {layout.height}px,
              left {layout.left}px, bottom {layout.bottom}px.
            </p>
          </div>

          {/* Emitted line */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="game" tone="primary" size="sm" disabled={!line}
                onClick={() => copy(line, "line copied")}>
                Copy line
              </Button>
              <Button variant="game" tone="neutral" size="sm" disabled={modifiedDexes.length === 0}
                onClick={() =>
                  copy(
                    modifiedDexes
                      .map((d) =>
                        formatLine(d, drafts[d]) ||
                        `// ${d} ${getPokemonName(d).toLowerCase()} — no override needed, delete the entry`,
                      )
                      .join("\n"),
                    `${modifiedDexes.length} line(s) copied`,
                  )
                }>
                Copy all modified ({modifiedDexes.length})
              </Button>
              <Button variant="game" tone="neutral" size="sm"
                onClick={() => setDrafts((p) => { const n = { ...p }; delete n[dex]; return n; })}>
                Reset to committed
              </Button>
              <Button variant="game" tone="danger" size="sm"
                onClick={() => setDrafts((p) => ({ ...p, [dex]: { ...NEUTRAL } }))}>
                Clear override
              </Button>
              {copied && <span className="text-[11px] font-black text-pb-primary uppercase">{copied}</span>}
            </div>
            <pre className="text-xs font-mono bg-pb-bg border-2 border-black rounded p-2 overflow-x-auto">
              {line || `// #${dex} matches the default — no entry needed`}
            </pre>
            <p className="text-[11px] font-bold text-pb-ink/60">
              Nothing is saved. Paste into the matching group in{" "}
              <code>src/lib/buddy-overrides.ts</code> and extend the comment with the reason.
            </p>
          </div>

          {/* View options */}
          <div className="flex items-center gap-3 flex-wrap text-xs font-bold text-pb-ink">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={showGuide} onChange={(e) => setShowGuide(e.target.checked)} />
              guides
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={isShiny} onChange={(e) => setIsShiny(e.target.checked)} />
              shiny
            </label>
            <label className="flex items-center gap-1.5">
              width
              <select value={widthMode} onChange={(e) => setWidthMode(e.target.value as typeof widthMode)}
                className="px-2 py-1 rounded border-2 border-black bg-white">
                <option value="fluid">fluid (resize window)</option>
                <option value="narrow">narrow 320</option>
                <option value="wide">wide 400</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              theme
              <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeId)}
                className="px-2 py-1 rounded border-2 border-black bg-white">
                {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              avatar
              <input value={avatarId} onChange={(e) => setAvatarId(e.target.value)}
                className="w-20 px-2 py-1 rounded border-2 border-black bg-white" />
            </label>
          </div>

          {/* Species picker */}
          <div className="flex flex-col gap-2 min-h-0">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter by name or dex number"
              className="px-2 py-1.5 rounded border-2 border-black bg-white text-xs font-bold"
            />
            <div className="flex flex-wrap gap-1 content-start">
              {visibleDexes.map((d) => (
                <button
                  key={d}
                  onClick={() => setDex(d)}
                  title={`#${d} ${getPokemonName(d)}`}
                  className={cn(
                    "w-11 h-11 rounded border-2 bg-white/70 shrink-0",
                    d === dex ? "border-pb-poppy border-[3px]" : "border-black/20",
                    BUDDY_OVERRIDES[d] && d !== dex && "border-pb-primary",
                    isModified(d) && d !== dex && "border-pb-poppy border-dashed",
                  )}
                >
                  <img src={getPokedexSprite(d)} alt={getPokemonName(d)}
                    className="w-full h-full object-contain" style={{ imageRendering: "pixelated" }} />
                </button>
              ))}
            </div>
            <p className="text-[11px] font-bold text-pb-ink/60">
              Green border = has a committed override · dashed red = modified this session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-xs font-black uppercase text-pb-ink">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-pb-primary"
      />
      <input
        type="number" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 px-2 py-1 rounded border-2 border-black bg-white text-xs font-bold"
      />
    </div>
  );
}
