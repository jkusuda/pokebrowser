"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "api-client";
import type { CatchResult, Token } from "api-client";
import { getPokemonSprite } from "@/lib/pokemon";
import { getPokemonName } from "pokemon-data";
import { runCatchAnimation } from "@/lib/catch-animation";
import { tokenLabel } from "@/lib/events-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal-shell";
import { api } from "@/lib/api";
import { useRefresh } from "@/lib/hooks/useRefresh";

// Beat between the Pokémon appearing and the ball being thrown, so the user
// gets a moment to see what they summoned.
const APPEAR_BEAT_MS = 900;

type Phase = "summoning" | "appeared" | "caught" | "error";

type Props = {
  token: Token;
  /** `opened` is true when the token was successfully redeemed. */
  onClose: (opened: boolean) => void;
};

export default function TokenEncounterModal({ token, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("summoning");
  const [result, setResult] = useState<CatchResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { refresh } = useRefresh();
  const started = useRef(false);
  const pokeballRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLImageElement>(null);

  // Redeem the token as soon as the modal mounts.
  useEffect(() => {
    // Ref guard: StrictMode double-invokes effects in dev, and a second POST
    // for the same token would 409 with "already used".
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        setResult(await api.openToken(token.id));
        setPhase("appeared");
      } catch (err) {
        setError(err instanceof Error ? err : new Error("An error occurred"));
        setPhase("error");
      }
    })();
  }, [token.id]);

  // Once the Pokémon is on screen, throw the ball (the catch already
  // happened server-side — this is the reveal).
  useEffect(() => {
    if (phase !== "appeared") return;
    let cancelled = false;

    (async () => {
      await new Promise((r) => setTimeout(r, APPEAR_BEAT_MS));
      if (cancelled || !pokeballRef.current || !spriteRef.current) return;
      await runCatchAnimation(pokeballRef.current, spriteRef.current);
      if (cancelled) return;
      setPhase("caught");
      refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [phase, refresh]);

  const name = result ? getPokemonName(result.pokedexNumber) : "";
  const boxFull = error instanceof ApiError && error.code === "catch_limit_reached";
  const dismissible = phase === "caught" || phase === "error";

  return (
    <ModalShell
      onClose={dismissible ? () => onClose(phase === "caught") : undefined}
      backdropClassName="bg-black/60"
    >
      <Card
        variant="game"
        tone="cream"
        className="relative z-10 w-full max-w-xs mx-4 bg-pb-bg p-5 gap-1 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="text-emboss-sm text-[13px] text-center">
          {phase === "summoning" && `Opening ${tokenLabel(token.tokenType, token.pokedexNumber)}...`}
          {phase === "appeared" && `A wild ${name} appeared!`}
          {phase === "caught" && `Gotcha! ${name} was caught!`}
          {phase === "error" && "Oh no!"}
        </div>

        {/* Sprite stage — layout mirrors the extension's encounter popup
            (apps/extension/src/lib/popup.ts .sprite-area) */}
        <div className="relative w-[220px] h-[100px] flex items-end justify-center">
          {result?.isShiny && phase === "appeared" && (
            <span className="absolute top-0 right-0 z-4 text-base text-amber-500 animate-sparkle drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
              ✦
            </span>
          )}
          {result && phase !== "error" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={spriteRef}
              src={getPokemonSprite(result.pokedexNumber, result.isShiny)}
              alt={name}
              className="absolute bottom-[22px] z-2 w-20 h-20 object-contain transition-opacity duration-150"
              style={{ imageRendering: "pixelated" }}
            />
          )}
          <div
            ref={pokeballRef}
            className="absolute z-3"
            style={{
              bottom: 20,
              left: "calc(50% - 32px)",
              width: 64,
              height: 64,
              imageRendering: "pixelated",
              background: "url(/pokeball-spritesheet.png) no-repeat",
              backgroundSize: "1792px 2048px",
              backgroundPosition: "0 0",
              opacity: 0,
              transform: "scale(2)",
            }}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 z-1"
            style={{
              width: 220,
              height: 64,
              background: "url(/grass-platform.webp) center / contain no-repeat",
              imageRendering: "pixelated",
            }}
          />
        </div>

        {/* Result badges / error message */}
        {phase === "caught" && result && (result.isShiny || result.isNewSpecies) && (
          <div className="flex gap-2 mt-1">
            {result.isShiny && (
              <span className="px-2 py-0.5 bg-amber-300 border-2 border-black rounded-md text-[10px] font-black uppercase shadow-[2px_2px_0_black]">
                ✨ Shiny
              </span>
            )}
            {result.isNewSpecies && (
              <span className="px-2 py-0.5 bg-pb-accent border-2 border-black rounded-md text-[10px] font-black uppercase shadow-[2px_2px_0_black]">
                New species
              </span>
            )}
          </div>
        )}
        {phase === "error" && (
          <p className="text-center font-bold text-sm text-red-600">
            {error?.message}
            {boxFull && (
              <span className="block mt-1 text-xs text-black/60 font-bold">
                Your token was kept — free up some box space and try again.
              </span>
            )}
          </p>
        )}

        {/* Actions */}
        {dismissible ? (
          <Button
            onClick={() => onClose(phase === "caught")}
            variant="game"
            tone={phase === "caught" ? "primary" : "mint"}
            className="w-full h-auto py-2.5 text-sm tracking-wide mt-2 [-webkit-text-stroke:0px]"
          >
            {phase === "caught" ? "NICE!" : "CLOSE"}
          </Button>
        ) : (
          <div className="h-[46px]" aria-hidden="true" />
        )}
      </Card>
    </ModalShell>
  );
}
