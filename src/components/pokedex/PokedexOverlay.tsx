"use client";

import { Fragment, useState, useMemo } from "react";
import { getPokemonSprite, getPokemonData, getPokemonName } from "@/lib/pokemon";
import { getFamilyId } from "pokemon-data";
import { Pokemon, PokedexUnlock } from "@/types";
import { getTypeColor, getTypeIconPath } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PokedexEntry {
  id: number;
  name: string;
  isCaught: boolean;
  types?: string[];
  weight?: number;
  height?: number;
  baseStats?: {
    hp: number;
    atk: number;
    def: number;
    spAtk: number;
    spDef: number;
    speed: number;
  };
  description?: string;
  firstCaughtAt?: string | null;
}

// Pokémon that branch into multiple evolutions — `evolvesTo` only models a
// linear chain, so Eevee's eeveelutions need to live here explicitly.
const BRANCHING_EVOLUTIONS: Record<number, number[]> = {
  133: [134, 135, 136], // Eevee → Vaporeon / Jolteon / Flareon
};

type EvolutionShape =
  | { kind: "linear"; chain: number[] }
  | { kind: "branching"; base: number; branches: number[] };

function getEvolutionShape(id: number): EvolutionShape | null {
  const familyId = getFamilyId(id);
  const branches = BRANCHING_EVOLUTIONS[familyId];
  if (branches) return { kind: "branching", base: familyId, branches };

  const chain: number[] = [];
  let current: number | null = familyId;
  while (current !== null) {
    chain.push(current);
    current = getPokemonData(current)?.evolvesTo ?? null;
  }
  return chain.length > 1 ? { kind: "linear", chain } : null;
}

// Stat colors stay as hex — they're semantically tied to Pokémon stats
// (HP=red, Atk=orange, etc.) and don't belong in the generic palette.
const STAT_COLORS: Record<string, string> = {
  hp: "#FF5959", atk: "#F5AC78", def: "#FAE078",
  spAtk: "#9DB7F5", spDef: "#A7DB8D", speed: "#FA92B2",
};

const STAT_MAX: Record<string, number> = {
  hp: 255, atk: 255, def: 255, spAtk: 255, spDef: 255, speed: 255,
};

// Pokéball indicator — half red, half white, used in grid cells and detail header.
function CaughtDot({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-full border border-white/60 bg-linear-to-b from-red-500 from-50% to-white to-50%",
        className
      )}
    />
  );
}

function CaughtInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-pkd-screen/20 rounded border border-pkd-panel/50 px-2.5 py-2">
      <div className="text-[9px] font-black uppercase tracking-widest text-white/80 mb-1">{label}</div>
      <div className="font-mono text-[11px] text-white font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{value}</div>
    </div>
  );
}

function UnknownDataMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
      <div className="text-[11px] font-black uppercase tracking-widest text-white">Data Unknown</div>
      <div className="text-xs text-white text-center">Catch this Pokémon to reveal its data</div>
    </div>
  );
}

function EvoCell({
  id,
  isCaught,
  featured,
  className,
}: {
  id: number;
  isCaught: boolean;
  featured?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        featured ? "h-16 w-16" : "h-12 w-12",
        className
      )}
      title={isCaught ? `#${id}` : "Unknown"}
    >
      {isCaught ? (
        <img
          src={getPokemonSprite(id)}
          alt={`#${id}`}
          className="max-w-full max-h-full object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <span className={cn("font-black text-white/80", featured ? "text-4xl" : "text-3xl")}>?</span>
      )}
    </div>
  );
}

function EvolutionLine({ shape, caughtSet }: { shape: EvolutionShape; caughtSet: Set<number> }) {
  if (shape.kind === "linear") {
    return (
      <div className="flex items-center justify-center gap-2">
        {shape.chain.map((id, idx) => (
          <Fragment key={id}>
            <EvoCell id={id} isCaught={caughtSet.has(id)} />
            {idx < shape.chain.length - 1 && (
              <span className="text-white/70 text-lg font-black leading-none" aria-hidden>→</span>
            )}
          </Fragment>
        ))}
      </div>
    );
  }
  // Branching (Eevee): base centered, branches at top / right / bottom.
  const [top, right, bottom] = shape.branches;
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 place-items-center max-w-[200px] mx-auto">
      <EvoCell id={top} isCaught={caughtSet.has(top)} className="col-start-2 row-start-1" />
      <EvoCell id={shape.base} isCaught={caughtSet.has(shape.base)} className="col-start-2 row-start-2" featured />
      <EvoCell id={right} isCaught={caughtSet.has(right)} className="col-start-3 row-start-2" />
      <EvoCell id={bottom} isCaught={caughtSet.has(bottom)} className="col-start-2 row-start-3" />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
      {children}
    </div>
  );
}

function StatBar({ label, value, statKey }: { label: string; value: number; statKey: string }) {
  const max = STAT_MAX[statKey] ?? 255;
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = STAT_COLORS[statKey] ?? "#aaa";
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-[10px] font-black uppercase tracking-wider leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
        {label}
      </span>
      <div className="flex-1 relative h-4 bg-pkd-screen-dark rounded border-2 border-pkd-shell overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}aa` }}
        />
        <span className="absolute inset-0 flex items-center justify-end pr-1.5 font-mono text-[11px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] leading-none">
          {value}
        </span>
      </div>
    </div>
  );
}

function GridCell({
  entry,
  isSelected,
  onClick,
}: {
  entry: PokedexEntry;
  isSelected: boolean;
  onClick: () => void;
}) {
  const id = entry.id.toString().padStart(4, "0");
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "relative group h-auto p-0 flex items-center justify-center overflow-hidden rounded border-2 aspect-square",
        isSelected
          ? "border-pkd-accent bg-pkd-screen hover:bg-pkd-screen shadow-[0_0_10px_rgba(132,254,255,0.7)]"
          : "border-pkd-accent/40 bg-pkd-screen-light/70 hover:border-pkd-accent hover:bg-pkd-screen/70"
      )}
    >
      <span className="absolute top-0.5 left-1 text-[10px] font-mono font-black tracking-wider leading-none z-10 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
        {id}
      </span>

      {entry.isCaught && <CaughtDot className="absolute top-1 right-1 w-2.5 h-2.5 z-10" />}

      {entry.isCaught ? (
        <img
          src={getPokemonSprite(entry.id)}
          alt={entry.name}
          className="w-[78%] h-[78%] object-contain mt-2"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <span className="text-3xl font-black text-white mt-1">?</span>
      )}
    </Button>
  );
}

function DetailPanel({ entry, caughtSet }: { entry: PokedexEntry; caughtSet: Set<number> }) {
  const [activeTab, setActiveTab] = useState<"entry" | "stats">("entry");
  const id = entry.id.toString().padStart(4, "0");
  const name = entry.isCaught ? entry.name.replace(/-/g, " ").toUpperCase() : "???";
  const evolutionShape = useMemo(() => getEvolutionShape(entry.id), [entry.id]);

  const tabClass = (active: boolean) =>
    cn(
      "flex-1 h-auto py-2.5 rounded text-[11px] border-2 uppercase font-black tracking-widest",
      active
        ? "bg-pkd-screen border-white text-white shadow-[0_0_10px_rgba(116,234,240,0.7)] hover:bg-pkd-screen"
        : "bg-pkd-panel/80 border-pkd-shell text-white/70 hover:bg-pkd-screen-light hover:text-white"
    );

  return (
    <div className="flex flex-col h-full bg-pkd-panel">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-pkd-screen border-b-4 border-pkd-panel shrink-0">
        <span className="bg-pkd-panel/40 px-2 py-1 rounded text-[11px] font-mono font-black tracking-widest text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
          {id}
        </span>
        <span className="text-emboss flex-1 text-xl truncate">{name}</span>
        {entry.isCaught && (
          <CaughtDot className="w-6 h-6 border-2 border-white shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
        )}
      </div>

      {/* Sprite area */}
      <div className="relative flex items-center justify-center bg-pkd-screen border-b-4 border-pkd-panel shrink-0 min-h-48 py-4">
        <div className="absolute inset-0 flex items-center justify-center opacity-25">
          <div className="w-40 h-40 rounded-full bg-white blur-2xl" />
        </div>

        {entry.isCaught ? (
          <img
            src={getPokemonSprite(entry.id)}
            alt={entry.name}
            className="relative z-10 h-32 w-32 object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className="relative z-10 text-7xl font-black text-white">?</div>
        )}

        {entry.isCaught && entry.types && (
          <div className="absolute bottom-2 left-3 flex gap-1.5 z-10">
            {entry.types.map((t) => {
              const color = getTypeColor(t);
              return (
                <div
                  key={t}
                  className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,0.3)]"
                  style={{ backgroundColor: color.background, border: `2px solid ${color.border}` }}
                  title={t}
                >
                  <img src={getTypeIconPath(t)} alt={t} className="w-6 h-6 object-contain" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 bg-pkd-panel/10 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
        {activeTab === "stats" ? (
          entry.isCaught && entry.baseStats ? (
            <div className="flex flex-col gap-2.5">
              <StatBar label="HP" value={entry.baseStats.hp} statKey="hp" />
              <StatBar label="Atk" value={entry.baseStats.atk} statKey="atk" />
              <StatBar label="Def" value={entry.baseStats.def} statKey="def" />
              <StatBar label="Sp.Atk" value={entry.baseStats.spAtk} statKey="spAtk" />
              <StatBar label="Sp.Def" value={entry.baseStats.spDef} statKey="spDef" />
              <StatBar label="Speed" value={entry.baseStats.speed} statKey="speed" />
            </div>
          ) : (
            <UnknownDataMessage />
          )
        ) : entry.isCaught ? (
          <div className="flex flex-col gap-4">
            {/* Description */}
            <div>
              <SectionLabel>Entry</SectionLabel>
              <div className="bg-pkd-screen/20 rounded border border-pkd-panel/50 px-3 py-2.5">
                <p className="text-sm text-white leading-relaxed drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                  {entry.description || "No description available."}
                </p>
              </div>
            </div>

            {/* Weight / Height */}
            {(entry.weight != null || entry.height != null) && (
              <div className="grid grid-cols-2 gap-2">
                <CaughtInfo label="Weight" value={entry.weight != null ? `${entry.weight} kg` : "—"} />
                <CaughtInfo label="Height" value={entry.height != null ? `${entry.height} m` : "—"} />
              </div>
            )}

            {/* Evolution line */}
            {evolutionShape && (
              <div>
                <SectionLabel>Evolution</SectionLabel>
                <EvolutionLine shape={evolutionShape} caughtSet={caughtSet} />
              </div>
            )}

            {/* First catch date */}
            {entry.firstCaughtAt && (
              <CaughtInfo
                label="First Caught"
                value={new Date(entry.firstCaughtAt).toLocaleDateString()}
              />
            )}
          </div>
        ) : (
          <UnknownDataMessage />
        )}
      </div>

      {/* Toggle Buttons */}
      <div className="shrink-0 flex items-center justify-center gap-2 px-3 py-2 bg-pkd-panel border-t-4 border-pkd-shell">
        <Button variant="ghost" onClick={() => setActiveTab("entry")} className={tabClass(activeTab === "entry")}>
          ENTRY
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab("stats")} className={tabClass(activeTab === "stats")}>
          STATS
        </Button>
      </div>
    </div>
  );
}

function LeftPanel({
  filtered,
  caught,
  total,
  search,
  onSearchChange,
  selectedId,
  onSelect,
}: {
  filtered: PokedexEntry[];
  caught: number;
  total: number;
  search: string;
  onSearchChange: (v: string) => void;
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex flex-col bg-pkd-panel border-r-4 border-pkd-shell w-[60%]">
      {/* Combined chrome strip: search + counter */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 bg-pkd-panel border-b-2 border-pkd-shell">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pkd-shell text-sm z-10 pointer-events-none">🔍</span>
          <Input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="pl-9 pr-3 py-2 h-auto border-2 rounded bg-pkd-screen-dark/40 border-pkd-shell text-white placeholder:text-white/50 focus:border-pkd-accent text-sm font-mono"
          />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono font-black tracking-wider text-white bg-pkd-screen-dark/40 border border-pkd-shell rounded px-2.5 py-2 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
          <CaughtDot className="w-3 h-3 mr-1" />
          <span>{caught.toString().padStart(3, "0")}</span>
          <span className="text-white/40 mx-0.5">/</span>
          <span>{total.toString().padStart(3, "0")}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 custom-scrollbar bg-pkd-screen-light">
        <div className="grid grid-cols-6 gap-1.5">
          {filtered.map((entry) => (
            <GridCell
              key={entry.id}
              entry={entry}
              isSelected={entry.id === selectedId}
              onClick={() => onSelect(entry.id)}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-32 text-[11px] font-black uppercase tracking-widest text-white/60">
            No Results
          </div>
        )}
      </div>
    </div>
  );
}

interface PokedexOverlayProps {
  pokemon?: Pokemon[];
  pokedexUnlocks?: PokedexUnlock[];
}

export function PokedexOverlay({ pokemon = [], pokedexUnlocks = [] }: PokedexOverlayProps) {
  const [selectedId, setSelectedId] = useState(1);
  const [search, setSearch] = useState("");

  const caught = pokedexUnlocks.length > 0
    ? pokedexUnlocks.length
    : new Set(pokemon.map((p) => p.pokedex_number)).size;
  const total = 151;

  // All entries built synchronously from static data — no fetching needed
  const entries = useMemo<PokedexEntry[]>(() => {
    return Array.from({ length: total }, (_, i) => {
      const id = i + 1;
      const caughtRecord = pokemon.find((p) => p.pokedex_number === id);
      const unlock = pokedexUnlocks.find((u) => u.pokedex_number === id);
      const isCaught = !!unlock || !!caughtRecord;
      const data = getPokemonData(id);

      return {
        id,
        name: data ? getPokemonName(id) : `pokemon-${id}`,
        isCaught,
        types: data?.types,
        weight: data?.weight,
        height: data?.height,
        baseStats: data?.baseStats,
        description: data?.description,
        firstCaughtAt: unlock?.unlocked_at ?? caughtRecord?.caught_at ?? null,
      };
    });
  }, [pokemon, pokedexUnlocks]);

  const caughtSet = useMemo(
    () => new Set(entries.filter((e) => e.isCaught).map((e) => e.id)),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.id.toString().includes(q) ||
        e.id.toString().padStart(4, "0").includes(q)
    );
  }, [entries, search]);

  const selectedEntry = entries.find((e) => e.id === selectedId) ?? entries[0];

  return (
    <div className="w-full px-1 pt-4 pb-2">
      <div className="flex flex-col h-[560px] rounded-[8px] border-4 border-pkd-shell shadow-[4px_4px_0_var(--color-pkd-shell)] overflow-hidden">
        <div className="flex flex-1 min-h-0">
          <LeftPanel
            filtered={filtered}
            caught={caught}
            total={total}
            search={search}
            onSearchChange={setSearch}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          <div className="flex flex-col flex-1 min-h-0 bg-pkd-panel/80 border-l-2 border-pkd-shell">
            <DetailPanel entry={selectedEntry!} caughtSet={caughtSet} />
          </div>
        </div>
      </div>
    </div>
  );
}