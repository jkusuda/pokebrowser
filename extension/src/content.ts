// Auth relay lives in auth-bridge.ts, which is registered as a separate
// content script scoped to the Pokebrowser origin only.
//
// Wrapped in an IIFE — content scripts share the same isolated-world global
// scope per-extension, so top-level `var`s would collide with auth-bridge.ts
// after minification.

import { CONFIG } from "./lib/config";
import { getPokemonSprite } from "./lib/sprites";
import { runCatchAnimation } from "./lib/animation";

(() => {

// Popup Styling
function getPopupCSS(grassUrl: string, pokeballUrl: string) {
  return `
    @import url("https://fonts.googleapis.com/css2?family=Outfit:wght@400..900&display=swap");

    :host {
      all: initial;
      font-family: "Outfit", sans-serif;
    }

    .overlay {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      pointer-events: none;
    }

    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(120%); }
      to   { opacity: 1; transform: translateX(0); }
    }

    @keyframes slideOutRight {
      from { opacity: 1; transform: translateX(0); }
      to   { opacity: 0; transform: translateX(120%); }
    }

    @keyframes sparkle {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%      { opacity: 0.5; transform: scale(1.3); }
    }

    /* ── Pokeball animation keyframes ── */

    @keyframes pb-throw {
      0%   { transform: translate(50px, 10px) scale(0.8); }
      50%  { transform: translate(25px, -50px) scale(1.5); }
      100% { transform: translate(0px, 0px) scale(2); }
    }

    @keyframes pb-shake {
      0%   { transform: scale(2) rotate(0deg); }
      20%  { transform: scale(2) rotate(-12deg); }
      40%  { transform: scale(2) rotate(12deg); }
      60%  { transform: scale(2) rotate(-8deg); }
      80%  { transform: scale(2) rotate(8deg); }
      100% { transform: scale(2) rotate(0deg); }
    }

    @keyframes pb-success {
      0%   { transform: scale(2); }
      40%  { transform: scale(2.6); }
      70%  { transform: scale(1.9); }
      100% { transform: scale(2); }
    }

    .card {
      background: #e0f4d9;
      border: 4px solid black;
      border-radius: 12px;
      box-shadow: 6px 6px 0 black;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      width: 220px;
      pointer-events: all;
      animation: slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .card.dismissing {
      animation: slideOutRight 0.3s ease-in forwards;
    }

    .title {
      font-weight: 900;
      font-size: 13px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: white;
      -webkit-text-stroke: 1.2px black;
      text-shadow: 0 2px 0 black;
      text-align: center;
    }

    .sprite-area {
      position: relative;
      width: 220px;
      height: 100px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .sprite-area img.pokemon {
      width: 80px;
      height: 80px;
      object-fit: contain;
      image-rendering: pixelated;
      position: absolute;
      bottom: 22px;
      z-index: 2;
      transition: opacity 0.15s ease;
    }

    .sprite-area .grass {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 220px;
      height: 64px;
      background: url("${grassUrl}") center / contain no-repeat;
      image-rendering: pixelated;
      z-index: 1;
    }

    /* Pokeball canvas — sits in the sprite-area during catch animation */
    .pokeball-canvas {
      position: absolute;
      bottom: 20px;
      left: calc(50% - 32px);
      width: 64px;
      height: 64px;
      image-rendering: pixelated;
      background: url("${pokeballUrl}") no-repeat;
      background-size: 1792px 2048px;
      background-position: 0 0;
      opacity: 0;
      z-index: 3;
      transform: scale(2);
    }

    .shiny-badge {
      position: absolute;
      top: 0;
      right: 0;
      font-size: 16px;
      color: #f59e0b;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
      animation: sparkle 1.2s ease-in-out infinite;
      z-index: 4;
    }

    .buttons {
      display: flex;
      gap: 10px;
      width: 100%;
      margin-top: 4px;
    }

    .btn {
      flex: 1;
      padding: 10px 0;
      font-family: "Outfit", sans-serif;
      font-weight: 900;
      font-size: 12px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: white;
      -webkit-text-stroke: 0.5px black;
      text-shadow: 0 1px 0 black;
      border: 3px solid black;
      border-radius: 8px;
      cursor: pointer;
      transition: all 75ms;
      box-shadow: 3px 3px 0 black;
    }

    .btn:active {
      box-shadow: none;
      transform: translate(3px, 3px);
    }

    .btn-catch {
      background: #8abf8a;
    }
    .btn-catch:hover {
      background: #9dcd9d;
    }

    .btn-run {
      background: #c0392b;
    }
    .btn-run:hover {
      background: #e74c3c;
    }

    .catch-result {
      font-weight: 900;
      font-size: 14px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: white;
      -webkit-text-stroke: 1px black;
      text-shadow: 0 2px 0 black;
      text-align: center;
      width: 100%;
    }
  `;
}

// Encounter UI Logic
function showEncounterPopup(
  encounter: { pokedexNumber: number; isShiny: boolean; name: string; nonce: string },
  boxIsFull: boolean
) {
  if (document.getElementById("pokebrowse-encounter")) return;

  const host = document.createElement("div");
  host.id = "pokebrowse-encounter";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "closed" });

  let grassUrl = "";
  let pokeballUrl = "";
  try {
    grassUrl = chrome.runtime.getURL("grass-platform.webp");
    pokeballUrl = chrome.runtime.getURL("pokeball-spritesheet.png");
  } catch (e) {
    console.debug("Pokebrowser: Extension context invalidated.");
    return;
  }

  const style = document.createElement("style");
  style.textContent = getPopupCSS(grassUrl, pokeballUrl);
  shadow.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="card">
      <div class="title">A wild ${encounter.name} appeared!</div>
      <div class="sprite-area">
        ${encounter.isShiny ? '<span class="shiny-badge">✦</span>' : ""}
        <img class="pokemon" src="${getPokemonSprite(encounter.pokedexNumber, encounter.isShiny)}" alt="${encounter.name}" />
        <div class="pokeball-canvas"></div>
        <div class="grass"></div>
      </div>
      ${boxIsFull ? `
        <div class="title" style="margin-top: 8px; color: #ff8a8a; -webkit-text-stroke: 1px black;">Your box is full!</div>
        <div class="buttons">
          <button class="btn btn-run" id="run-btn">Run</button>
        </div>
      ` : `
        <div class="buttons">
          <button class="btn btn-catch" id="catch-btn">Catch</button>
          <button class="btn btn-run" id="run-btn">Run</button>
        </div>
      `}
    </div>
  `;
  shadow.appendChild(overlay);

  const runBtn = shadow.getElementById("run-btn")!;
  const catchBtn = shadow.getElementById("catch-btn");

  function dismiss() {
    const card = shadow.querySelector(".card");
    if (card) {
      card.classList.add("dismissing");
      setTimeout(() => host.remove(), 300);
    } else {
      host.remove();
    }
  }

  runBtn.addEventListener("click", dismiss);

  if (catchBtn) {
    catchBtn.addEventListener("click", () => {
      // Lock both inputs immediately to prevent duplicate network calls.
      catchBtn.setAttribute("disabled", "true");
      runBtn.setAttribute("disabled", "true");

      const pokemonImg = shadow.querySelector(".pokemon") as HTMLElement;
      const pokeballEl = shadow.querySelector(".pokeball-canvas") as HTMLElement;
      const buttonsDiv = shadow.querySelector(".buttons") as HTMLElement;

      // Trigger visual sequence before executing network request
      runCatchAnimation(pokeballEl, pokemonImg).then(() => {
        try {
          chrome.runtime.sendMessage(
            {
              type: "PERFORM_CATCH",
              payload: {
                encounterNonce: encounter.nonce,
                caughtOn: window.location.hostname,
              },
            },
            (response) => {
              const resultEl = document.createElement("div");
              resultEl.className = "catch-result";

              if (response?.ok) {
                resultEl.textContent = `Gotcha! ${encounter.name} was caught!`;
              } else {
                resultEl.textContent = response?.error === "CATCH_LIMIT_REACHED"
                  ? "Box is full!"
                  : "Something went wrong...";
              }

              buttonsDiv.innerHTML = "";
              buttonsDiv.appendChild(resultEl);

              setTimeout(() => dismiss(), 2000);
            }
          );
        } catch (e) {
          console.debug("Pokebrowser: Extension context invalidated.");
          buttonsDiv.innerHTML = "";
          buttonsDiv.textContent = "Extension reloaded. Please refresh the page.";
          setTimeout(() => host.remove(), 2000);
        }
      });
    });
  }
}

// Extension Initialization
async function tryEncounter() {
  if (Math.random() > CONFIG.GAME.ENCOUNTER_RATE) return;

  try {
    const session: any = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
    if (!session?.loggedIn || !session.encounter) return;

    setTimeout(() => {
      showEncounterPopup(session.encounter, !!session.boxIsFull);
    }, 1500);
  } catch (e) {
    console.debug("Pokebrowser: Extension context invalidated.");
  }
}

if (!window.location.href.startsWith(CONFIG.WEBSITE_URL)) {
  tryEncounter();
}
})();
