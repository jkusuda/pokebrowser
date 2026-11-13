// Encounters and the buddy companion; auth flows through the web app (see background.ts).

import { CONFIG } from "./lib/config";
import { getPokemonSprite, getPokemonCry } from "./lib/sprites";
import { runCatchAnimation } from "./lib/animation";
import { initBuddy, celebrateBuddy } from "./lib/buddy";
import { initSound, playSound } from "./lib/sound";
import { isBlockedHost, resolveAccountPrefs } from "./lib/account-prefs";
import { getFontFaceCSS, getPopupCSS, getPopupHTML } from "./lib/popup";
import type { ThemeId } from "./lib/theme";
import type {
  EncounterPayload,
  ExtensionMessage,
  GetSessionResponse,
  PerformCatchResponse,
} from "./lib/messages";

function showEncounterPopup(
  encounter: EncounterPayload,
  boxIsFull: boolean,
  theme: ThemeId,
  animate: boolean
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
  } catch {
    console.debug("Pokebrowser: Extension context invalidated.");
    return;
  }

  // Register the bundled fonts at document scope — @font-face inside a
  // shadow root doesn't take effect in Chrome.
  if (!document.getElementById("pokebrowse-fonts")) {
    const fontStyle = document.createElement("style");
    fontStyle.id = "pokebrowse-fonts";
    fontStyle.textContent = getFontFaceCSS();
    document.head.appendChild(fontStyle);
  }

  const style = document.createElement("style");
  style.textContent = getPopupCSS(grassUrl, pokeballUrl, theme);
  shadow.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = getPopupHTML(
    encounter,
    getPokemonSprite(encounter.pokedexNumber, encounter.isShiny),
    boxIsFull
  );
  shadow.appendChild(overlay);

  // Announce the encounter with its cry (silent on pages the user hasn't
  // interacted with yet — autoplay policy).
  playSound(getPokemonCry(encounter.pokedexNumber), 0.4);

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

      // Trigger visual sequence before executing network request. With
      // animations off we skip straight to the request, but still apply the
      // one side effect the rest of the flow depends on: runCatchAnimation
      // hides the sprite partway through, and without that the result text
      // renders on top of a still-visible Pokemon.
      const sequence = animate
        ? runCatchAnimation(pokeballEl, pokemonImg)
        : Promise.resolve().then(() => {
            pokemonImg.style.opacity = "0";
          });

      sequence.then(() => {
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
                celebrateBuddy();
                try {
                  playSound(chrome.runtime.getURL("catch_success.wav"), 0.5);
                } catch {
                  // Extension context invalidated — skip the jingle.
                }
              } else if (response?.error === "CATCH_LIMIT_REACHED") {
                resultEl.textContent = "Box is full!";
              } else if (response?.error === "DAILY_LIMIT_REACHED") {
                resultEl.textContent = "You've caught enough for today!";
              } else {
                resultEl.textContent = "Something went wrong...";
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

/** Skips rolls the server would decline; the short hold keeps concurrent tabs from rolling together. */
async function claimRollSlot(): Promise<boolean> {
  const stored = await chrome.storage.local.get(CONFIG.NEXT_ROLL_KEY);
  const nextRollAt = stored[CONFIG.NEXT_ROLL_KEY] as number | undefined;
  if (typeof nextRollAt === "number" && Date.now() < nextRollAt) return false;

  await chrome.storage.local.set({
    [CONFIG.NEXT_ROLL_KEY]: Date.now() + CONFIG.ROLL_IN_FLIGHT_MS,
  });
  return true;
}

function holdUntil(retryAfterMs: number): void {
  void chrome.storage.local.set({
    [CONFIG.NEXT_ROLL_KEY]: Date.now() + Math.max(0, retryAfterMs),
  });
}

async function tryEncounter() {
  try {
    if (!(await claimRollSlot())) return;

    const sessionMessage: ExtensionMessage = { type: "GET_SESSION" };
    const session = (await chrome.runtime.sendMessage(sessionMessage)) as
      | GetSessionResponse
      | undefined;
    if (!session?.loggedIn) {
      if (session?.retryAfterMs) holdUntil(session.retryAfterMs);
      return;
    }

    const { encounter, boxIsFull, theme, retryAfterMs, encounterAnimations } = session;
    holdUntil(retryAfterMs);

    if (!encounter) return;

    setTimeout(() => {
      showEncounterPopup(encounter, boxIsFull, theme, encounterAnimations);
    }, 1500);
  } catch {
    console.debug("Pokebrowser: Extension context invalidated.");
  }
}

/** Reads the cached account prefs; with no cache yet, nothing is blocked. */
async function isSiteBlocked(): Promise<boolean> {
  try {
    const stored = await chrome.storage.local.get(CONFIG.ACCOUNT_PREFS_KEY);
    const prefs = resolveAccountPrefs(stored[CONFIG.ACCOUNT_PREFS_KEY]);
    return isBlockedHost(window.location.hostname, prefs.blockedSites);
  } catch {
    return false;
  }
}

void (async () => {
  if (window.location.href.startsWith(CONFIG.WEBSITE_URL)) return;

  // Before tryEncounter: a blocked page must not take the roll slot other tabs wait on.
  // No onChanged listener is registered here, so unblocking applies on the next reload.
  if (await isSiteBlocked()) return;

  initSound();
  void initBuddy();
  tryEncounter();
})();
