import { useState, useEffect, useMemo } from "react";
import { Pokemon, PokemonInfo, Candy } from "@/types";
import { getPokemonSprite, getPokemonData, getFamilyId } from "@/lib/pokemon";
import { filterCollection } from "@/lib/collection-search";
import { postJson } from "@/lib/client-api";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PokemonDetailsPanel from "./PokemonDetailsPanel";
import NicknameModal from "@/components/profile/NicknameModal";
import ReleaseModal from "@/components/profile/ReleaseModal";

const PANEL_TRANSITION_MS = 300;

export default function CollectionTab({ pokemon, candies, search = "" }: { pokemon: Pokemon[], candies: Candy[], search?: string }) {
  const [displayPokemon, setDisplayPokemon] = useState<Pokemon | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pokemon: Pokemon } | null>(null);
  const [nicknameTarget, setNicknameTarget] = useState<Pokemon | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<Pokemon | null>(null);

  const { refresh } = useRefresh();

  const filteredPokemon = useMemo(() => filterCollection(pokemon, search), [pokemon, search]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Keep the open detail panel in sync with refreshed server data (e.g. after
  // an evolution changes pokedex_number). displayPokemon holds a snapshot so
  // the panel stays populated during its close animation after a release, but
  // while the Pokémon still exists the live row wins.
  const livePokemon = displayPokemon
    ? pokemon.find((p) => p.id === displayPokemon.id)
    : undefined;
  if (
    livePokemon &&
    (livePokemon.pokedex_number !== displayPokemon!.pokedex_number ||
      livePokemon.nickname !== displayPokemon!.nickname)
  ) {
    // Render-time state adjustment (guarded, so it can't loop) — the React
    // alternative to syncing props into state with an effect.
    setDisplayPokemon(livePokemon);
  }

  const handleSelect = (p: Pokemon) => {
    if (displayPokemon && displayPokemon.id !== p.id && isPanelVisible) {
      setIsPanelVisible(false);
      setTimeout(() => {
        setDisplayPokemon(p);
        setIsPanelVisible(true);
      }, PANEL_TRANSITION_MS);
    } else {
      setDisplayPokemon(p);
      setIsPanelVisible(true);
    }
  };

  const handleClose = () => {
    setIsPanelVisible(false);
    setTimeout(() => setDisplayPokemon(null), PANEL_TRANSITION_MS);
  };

  const handleContextMenu = (e: React.MouseEvent, p: Pokemon) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, pokemon: p });
  };

  const handleSetBuddy = async (p: Pokemon) => {
    try {
      await postJson("/api/trainer/buddy", { pokemonId: p.id });
      refresh();
    } catch (err) {
      console.error("Set buddy error:", err);
      alert("Failed to set buddy.");
    }
  };

  const handleNicknameSaved = (p: Pokemon, nickname: string) => {
    if (displayPokemon?.id === p.id) {
      setDisplayPokemon({ ...p, nickname });
    }
  };

  const handleReleased = (p: Pokemon) => {
    if (displayPokemon?.id === p.id) {
      setIsPanelVisible(false);
      setTimeout(() => setDisplayPokemon(null), PANEL_TRANSITION_MS);
    }
  };

  // Synchronous lookups — no network calls needed
  const pokemonInfo = displayPokemon ? getPokemonData(displayPokemon.pokedex_number) : null;
  const familyId = displayPokemon ? getFamilyId(displayPokemon.pokedex_number) : null;
  const familyInfo = familyId !== null ? getPokemonData(familyId) : null;

  if (pokemon.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-black tracking-widest uppercase text-[9px] text-pb-forest/40 text-center leading-relaxed">
          NO POKÉMON YET<br />GO CATCH SOME!
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {filteredPokemon.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="font-black tracking-widest uppercase text-[9px] text-pb-forest/40 text-center leading-relaxed">
              NO MATCHES<br />TRY A DIFFERENT SEARCH
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1 place-items-center">
            {filteredPokemon.map((p) => (
              <div
                key={p.id}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => handleSelect(p)}
                onContextMenu={(e) => handleContextMenu(e, p)}
              >
                <div className="relative">
                  <img
                    src={getPokemonSprite(p.pokedex_number, p.is_shiny)}
                    alt={p.nickname || `#${p.pokedex_number}`}
                    className="w-20 h-20 object-contain mb-0 drop-shadow-md hover:scale-100 transition-transform"
                    style={{ imageRendering: "pixelated" }}
                  />
                  {p.is_shiny && (
                    <span className="absolute top-0 right-0 text-sm text-amber-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] pointer-events-none">
                      ✦
                    </span>
                  )}
                </div>
                {p.nickname && (
                  <p className="font-bold text-[14px] text-white truncate w-[120%] text-center z-10 [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
                    {p.nickname}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <PokemonDetailsPanel
        pokemon={displayPokemon}
        pokemonInfo={pokemonInfo as PokemonInfo | null}
        familyInfo={familyInfo as PokemonInfo | null}
        candies={candies}
        isVisible={isPanelVisible}
        onClose={handleClose}
      />

      {contextMenu && (
        <Card
          variant="game"
          tone="cream"
          size="sm"
          shadow="sm"
          className="fixed z-50 w-40 p-1 gap-0 font-black tracking-widest uppercase"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="justify-start h-auto px-3 py-2 text-[10px] text-black uppercase rounded-sm"
            onClick={() => {
              setContextMenu(null);
              handleSetBuddy(contextMenu.pokemon);
            }}
          >
            Set Buddy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start h-auto px-3 py-2 text-[10px] text-black uppercase rounded-sm"
            onClick={() => {
              setNicknameTarget(contextMenu.pokemon);
              setContextMenu(null);
            }}
          >
            Change Nickname
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start h-auto px-3 py-2 text-[10px] text-red-600 hover:text-red-700 uppercase rounded-sm"
            onClick={() => {
              setReleaseTarget(contextMenu.pokemon);
              setContextMenu(null);
            }}
          >
            Release
          </Button>
        </Card>
      )}

      {nicknameTarget && (
        <NicknameModal
          pokemon={nicknameTarget}
          onClose={() => setNicknameTarget(null)}
          onSaved={(nickname) => handleNicknameSaved(nicknameTarget, nickname)}
        />
      )}

      {releaseTarget && (
        <ReleaseModal
          pokemon={releaseTarget}
          onClose={() => setReleaseTarget(null)}
          onReleased={() => handleReleased(releaseTarget)}
        />
      )}
    </div>
  );
}
