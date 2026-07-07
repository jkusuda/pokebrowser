// Auth flows through the web app via externally_connectable (see
// background.ts) — this script only handles encounters.
//
// Wrapped in an IIFE so nothing leaks into the shared isolated-world
// global scope.

import { CONFIG } from "./lib/config";
import { getPokemonSprite } from "./lib/sprites";
import { runCatchAnimation } from "./lib/animation";
import { getPopupCSS, getPopupHTML } from "./lib/popup";
import type {
  EncounterPayload,
  ExtensionMessage,
  GetSessionResponse,
  PerformCatchResponse,
} from "./types/messages";

(() => {

// Encounter UI Logic
function showEncounterPopup(encounter: EncounterPayload, boxIsFull: boolean) {
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
  } catch {
    console.debug("Pokebrowser: Extension context invalidated.");
    return;
  }

  const style = document.createElement("style");
  style.textContent = getPopupCSS(grassUrl, pokeballUrl);
  shadow.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = getPopupHTML(
    encounter,
    getPokemonSprite(encounter.pokedexNumber, encounter.isShiny),
    boxIsFull
  );
  shadow.appendChild(overlay);

  const runBtn = shadow.getElementById("run-btn");
  const catchBtn = shadow.getElementById("catch-btn");
  if (!runBtn) {
    host.remove();
    return;
  }

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
          const catchMessage: ExtensionMessage = {
            type: "PERFORM_CATCH",
            payload: {
              encounterNonce: encounter.nonce,
              caughtOn: window.location.hostname,
            },
          };
          chrome.runtime.sendMessage(
            catchMessage,
            (response: PerformCatchResponse | undefined) => {
              const resultEl = document.createElement("div");
              resultEl.className = "catch-result";

              if (response?.ok) {
                resultEl.textContent = `Gotcha! ${encounter.name} was caught!`;
              } else {
                resultEl.textContent = response && response.error === "CATCH_LIMIT_REACHED"
                  ? "Box is full!"
                  : "Something went wrong...";
              }

              buttonsDiv.innerHTML = "";
              buttonsDiv.appendChild(resultEl);

              setTimeout(() => dismiss(), 2000);
            }
          );
        } catch {
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
    const sessionMessage: ExtensionMessage = { type: "GET_SESSION" };
    const session = (await chrome.runtime.sendMessage(sessionMessage)) as
      | GetSessionResponse
      | undefined;
    if (!session?.loggedIn) return;

    const { encounter, boxIsFull } = session;
    setTimeout(() => {
      showEncounterPopup(encounter, boxIsFull);
    }, 1500);
  } catch {
    console.debug("Pokebrowser: Extension context invalidated.");
  }
}

if (!window.location.href.startsWith(CONFIG.WEBSITE_URL)) {
  tryEncounter();
}
})();
