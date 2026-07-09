import { useState, useEffect } from "react";
import { Pokemon, PokemonInfo, Candy } from "@/types";
import { getPokemonSprite, getPokemonData, getFamilyId } from "@/lib/pokemon";
import { postJson } from "@/lib/client-api";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PokemonDetailsPanel from "./PokemonDetailsPanel";

const PANEL_TRANSITION_MS = 300;

export default function CollectionTab({ pokemon, candies }: { pokemon: Pokemon[], candies: Candy[] }) {
  const [displayPokemon, setDisplayPokemon] = useState<Pokemon | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pokemon: Pokemon } | null>(null);

  const { refresh } = useRefresh();

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

  const handleChangeNickname = async (p: Pokemon) => {
    const info = getPokemonData(p.pokedex_number);
    const currentName = p.nickname || info?.name || "this Pokémon";
    const newNick = window.prompt(`Enter a new nickname for ${currentName} (leave blank for default name):`, p.nickname || "");
    if (newNick !== null) {
      let finalNick = newNick.trim();

      if (!finalNick) {
        const defaultName = info?.name ?? `Pokemon #${p.pokedex_number}`;
        finalNick = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
      }

      try {
        await postJson("/api/pokemon/nickname", { pokemonId: p.id, nickname: finalNick });
        refresh();
        if (displayPokemon?.id === p.id) {
          setDisplayPokemon({ ...p, nickname: finalNick });
        }
      } catch (err) {
        console.error("Nickname update error:", err);
        alert("Failed to update nickname.");
      }
    }
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

  const handleRelease = async (p: Pokemon) => {
    if (window.confirm(`Are you sure you want to release ${p.nickname || `#${p.pokedex_number}`}? This cannot be undone.`)) {
      try {
        await postJson("/api/pokemon/release", { pokemonId: p.id });
        refresh();
        if (displayPokemon?.id === p.id) {
          setIsPanelVisible(false);
          setTimeout(() => setDisplayPokemon(null), PANEL_TRANSITION_MS);
        }
      } catch (err) {
        console.error("Release error:", err);
        alert("Failed to release Pokémon.");
      }
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
        <div className="grid grid-cols-4 gap-1 place-items-center">
          {pokemon.map((p) => (
            <div
              key={p.id}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => handleSelect(p)}
              onContextMenu={(e) => handleContextMenu(e, p)}
            >
              <img
                src={getPokemonSprite(p.pokedex_number)}
                alt={p.nickname || `#${p.pokedex_number}`}
                className="w-20 h-20 object-contain mb-0 drop-shadow-md hover:scale-100 transition-transform"
                style={{ imageRendering: "pixelated" }}
              />
              {p.nickname && (
                <p className="font-bold text-[14px] text-white truncate w-[120%] text-center z-10 [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
                  {p.nickname}
                </p>
              )}
            </div>
          ))}
        </div>
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
              setContextMenu(null);
              handleChangeNickname(contextMenu.pokemon);
            }}
          >
            Change Nickname
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start h-auto px-3 py-2 text-[10px] text-red-600 hover:text-red-700 uppercase rounded-sm"
            onClick={() => {
              setContextMenu(null);
              handleRelease(contextMenu.pokemon);
            }}
          >
            Release
          </Button>
        </Card>
      )}
    </div>
  );
}
