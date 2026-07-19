// Buddy corner companion — renders the user's buddy Pokémon as an overworld
// walking sprite that patrols a short stretch near a bottom corner of every
// page. Clicking it plays a jump animation, floats a few hearts, and plays
// the Pokémon's cry.
//
// Sprites come from bundled atlases (extension/public/overworld/, see
// getOverworldSheet) — loaded via chrome.runtime.getURL, so page CSP can't
// block them. Each atlas packs 16 Pokémon walk sheets as a 4×4 grid of
// cells; each cell is itself a 4×4 grid of frames (rows face
// down/left/right/up, 4-frame walk cycle per row).
//
// Statically imported by content.ts, so the second Vite pass
// (vite.content.config.ts) still inlines it into the fully-bundled
// content.js IIFE.

import { CONFIG } from "./config";
import { playAnimation } from "./animation";
import { playSound } from "./sound";
import { getOverworldSheet, getPokemonCry } from "./sprites";
import { DEFAULT_BUDDY_PREFS, resolveBuddyPrefs, type BuddyPrefs } from "./buddy-prefs";
import type { BuddyPayload, ExtensionMessage, GetBuddyResponse } from "../types/messages";

// Mirrors the cache shape written by background.ts under CONFIG.BUDDY_KEY.
type BuddyCache = {
  pokemonId: string | null;
  buddy: BuddyPayload | null;
  fetchedAt: number;
};

const HOST_ID = "pokebrowse-buddy";

// Display size of one frame (the art is chunky pixel art; any multiple works).
const SPRITE_SIZE = 48;
// How far the buddy patrols from its corner anchor.
const TRACK_W = 160;
const WALK_SPEED_PX_S = 30;
const WALK_FRAME_MS = 150;
const IDLE_MIN_MS = 2000;
const IDLE_MAX_MS = 5000;
// Sheet row indices: down (facing viewer), left, right, up.
const ROW = { down: 0, left: 1, right: 2, up: 3 } as const;

let prefs: BuddyPrefs = DEFAULT_BUDDY_PREFS;
let currentBuddy: BuddyPayload | null = null;
let loaded = false;
let host: HTMLDivElement | null = null;
let lastSig: string | null = null;
let cleanupPatrol: (() => void) | null = null;
let celebrateFn: (() => void) | null = null;

function getBuddyCSS() {
  return `
    :host {
      all: initial;
    }

    .buddy-layer {
      position: fixed;
      bottom: 8px;
      width: ${TRACK_W + SPRITE_SIZE}px;
      height: ${SPRITE_SIZE}px;
      /* One below the encounter overlay so the catch card always wins. */
      z-index: 2147483646;
      pointer-events: none;
    }
    .buddy-layer.corner-br { right: 12px; }
    .buddy-layer.corner-bl { left: 12px; }

    .walker {
      position: absolute;
      bottom: 0;
      left: 0;
      width: ${SPRITE_SIZE}px;
      height: ${SPRITE_SIZE}px;
      transition: transform 0s linear;
      will-change: transform;
    }

    .sprite {
      width: 100%;
      height: 100%;
      background-repeat: no-repeat;
      /* The atlas is 16×16 frames (4×4 cells of 4×4 frames each). */
      background-size: ${SPRITE_SIZE * 16}px ${SPRITE_SIZE * 16}px;
      image-rendering: pixelated;
      /* The only clickable pixel area — everything else stays click-through. */
      pointer-events: auto;
      cursor: pointer;
    }

    @keyframes buddy-jump {
      0%   { transform: translateY(0); }
      15%  { transform: translateY(2px) scaleY(0.9); }
      45%  { transform: translateY(-16px); }
      75%  { transform: translateY(0); }
      85%  { transform: translateY(1px) scaleY(0.95); }
      100% { transform: translateY(0); }
    }

    .heart {
      position: absolute;
      bottom: ${SPRITE_SIZE - 4}px;
      font-size: 13px;
      color: #ff5a79;
      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
      z-index: 3;
      pointer-events: none;
      opacity: 0;
      animation: heart-float 0.9s ease-out forwards;
    }

    @keyframes heart-float {
      0%   { opacity: 0; transform: translateY(0) scale(0.6); }
      20%  { opacity: 1; }
      100% { opacity: 0; transform: translateY(-26px) scale(1.1); }
    }
  `;
}

function spawnHearts(walkerEl: HTMLElement) {
  const lefts = [0, 18, 36];
  lefts.forEach((left, i) => {
    const heart = document.createElement("span");
    heart.className = "heart";
    heart.textContent = "❤";
    heart.style.left = `${left}px`;
    heart.style.animationDelay = `${i * 0.12}s`;
    heart.addEventListener("animationend", () => heart.remove(), { once: true });
    walkerEl.appendChild(heart);
  });
}

function unmountBuddy() {
  cleanupPatrol?.();
  cleanupPatrol = null;
  celebrateFn = null;
  host?.remove();
  host = null;
  document.getElementById(HOST_ID)?.remove();
}

function mountBuddy(buddy: BuddyPayload) {
  if (document.getElementById(HOST_ID)) return;
  if (!document.body) return;

  let sheet: ReturnType<typeof getOverworldSheet>;
  try {
    sheet = getOverworldSheet(buddy.pokedexNumber, buddy.isShiny);
  } catch {
    console.debug("Pokebrowser: Extension context invalidated.");
    return;
  }

  host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = getBuddyCSS();
  shadow.appendChild(style);

  const layer = document.createElement("div");
  layer.className = `buddy-layer corner-${prefs.corner}`;
  shadow.appendChild(layer);

  const walker = document.createElement("div");
  walker.className = "walker";
  layer.appendChild(walker);

  const sprite = document.createElement("div");
  sprite.className = "sprite";
  sprite.style.backgroundImage = `url("${sheet.url}")`;
  sprite.setAttribute("role", "img");
  sprite.setAttribute("aria-label", buddy.nickname ?? "Buddy");
  walker.appendChild(sprite);

  // A background-image can't report load failures — probe with an Image so a
  // missing atlas (species without overworld art) unmounts silently.
  const probe = new Image();
  probe.onerror = () => unmountBuddy();
  probe.src = sheet.url;

  const reducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  /* ── Patrol state machine (timers live in this closure) ── */

  // Start hugging the corner: track x runs left→right within the layer.
  let x = prefs.corner === "bl" ? 0 : TRACK_W;
  let destroyed = false;
  let walking = false;
  let reacting = false;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let walkSafety: ReturnType<typeof setTimeout> | undefined;
  let stepInterval: ReturnType<typeof setInterval> | undefined;

  walker.style.transform = `translateX(${x}px)`;

  function setFrame(row: number, col: number) {
    const frameX = sheet.cellX * 4 + col;
    const frameY = sheet.cellY * 4 + row;
    sprite.style.backgroundPosition = `-${frameX * SPRITE_SIZE}px -${frameY * SPRITE_SIZE}px`;
  }

  function clearTimers() {
    clearTimeout(idleTimer);
    clearTimeout(walkSafety);
    clearInterval(stepInterval);
  }

  function idle() {
    if (destroyed) return;
    walking = false;
    clearTimers();
    setFrame(ROW.down, 0);
    idleTimer = setTimeout(startWalk, IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS));
  }

  function startWalk() {
    if (destroyed || reacting) return;
    const target = Math.random() * TRACK_W;
    const dist = Math.abs(target - x);
    if (dist < 16) {
      idle();
      return;
    }

    walking = true;
    const row = target < x ? ROW.left : ROW.right;
    let col = 0;
    setFrame(row, col);
    stepInterval = setInterval(() => {
      col = (col + 1) % 4;
      setFrame(row, col);
    }, WALK_FRAME_MS);

    const durationMs = (dist / WALK_SPEED_PX_S) * 1000;
    walker.style.transitionDuration = `${durationMs}ms`;
    walker.style.transform = `translateX(${target}px)`;
    x = target;

    // transitionend can be missed (e.g. heavy throttling) — never let the
    // walk cycle spin forever.
    walkSafety = setTimeout(() => {
      if (walking) idle();
    }, durationMs + 500);
  }

  walker.addEventListener("transitionend", (e) => {
    if (e.propertyName === "transform" && walking) idle();
  });

  // Freezes the walker at its current on-screen position mid-transition.
  function stopWalking() {
    if (!walking) return;
    walking = false;
    const t = getComputedStyle(walker).transform;
    x = t === "none" ? x : new DOMMatrixReadOnly(t).m41;
    walker.style.transitionDuration = "0ms";
    walker.style.transform = `translateX(${x}px)`;
  }

  // Shared reaction: jump + hearts, cry only on direct clicks (a catch has
  // its own success sound).
  function react(playCry: boolean) {
    if (destroyed || reacting) return;
    reacting = true;
    clearTimers();
    stopWalking();
    setFrame(ROW.down, 0);

    if (playCry) playSound(getPokemonCry(buddy.pokedexNumber), 0.4);

    spawnHearts(walker);

    if (reducedMotion) {
      setTimeout(() => {
        reacting = false;
      }, 700);
      return;
    }

    void playAnimation(sprite, "buddy-jump 0.7s ease-out").finally(() => {
      reacting = false;
      idle();
    });
  }

  sprite.addEventListener("click", () => react(true));
  celebrateFn = () => react(false);

  cleanupPatrol = () => {
    destroyed = true;
    clearTimers();
  };

  setFrame(ROW.down, 0);
  if (!reducedMotion) idle();
}

// Full re-render on any state change — the DOM is tiny, so unmount + remount
// is simpler than in-place patching (corner moves, buddy swaps, toggles).
// The signature guard matters because storage.onChanged fires in every open
// tab whenever the background rewrites the cache, usually with identical data.
function render() {
  const sig =
    prefs.visible && currentBuddy
      ? `${prefs.corner}|${currentBuddy.pokedexNumber}|${currentBuddy.isShiny}|${currentBuddy.nickname ?? ""}`
      : null;
  if (sig === lastSig) return;
  lastSig = sig;

  unmountBuddy();
  if (prefs.visible && currentBuddy) mountBuddy(currentBuddy);
}

/**
 * Loads the buddy from the storage cache, falling back to a GET_BUDDY
 * round trip when the cache is missing or older than the TTL.
 */
async function ensureBuddyLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;

  const stored = await chrome.storage.local.get(CONFIG.BUDDY_KEY);
  const cache = stored[CONFIG.BUDDY_KEY] as BuddyCache | undefined;
  if (cache && Date.now() - cache.fetchedAt < CONFIG.BUDDY_TTL_MS) {
    currentBuddy = cache.buddy;
    return;
  }

  const message: ExtensionMessage = { type: "GET_BUDDY" };
  const response = (await chrome.runtime.sendMessage(message)) as GetBuddyResponse | undefined;
  currentBuddy = response?.buddy ?? null;
}

function onStorageChanged(
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string
) {
  if (areaName !== "local") return;
  try {
    if (changes[CONFIG.BUDDY_PREFS_KEY]) {
      prefs = resolveBuddyPrefs(changes[CONFIG.BUDDY_PREFS_KEY].newValue);
      if (prefs.visible && !loaded) {
        void ensureBuddyLoaded().then(render);
        return;
      }
    }
    if (changes[CONFIG.BUDDY_KEY]) {
      const cache = changes[CONFIG.BUDDY_KEY].newValue as BuddyCache | undefined;
      currentBuddy = cache?.buddy ?? null;
    }
    render();
  } catch {
    console.debug("Pokebrowser: Extension context invalidated.");
  }
}

/**
 * Makes the buddy jump + float hearts (no cry) — called by content.ts when
 * the user catches a Pokémon. No-op while unmounted or mid-reaction.
 */
export function celebrateBuddy(): void {
  celebrateFn?.();
}

/** Entry point — called once per page load from content.ts. */
export async function initBuddy(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(CONFIG.BUDDY_PREFS_KEY);
    prefs = resolveBuddyPrefs(stored[CONFIG.BUDDY_PREFS_KEY]);

    // Subscribe first so popup toggles and background cache refreshes apply
    // live, even when the buddy starts out hidden.
    chrome.storage.onChanged.addListener(onStorageChanged);

    // Hidden → skip the fetch (don't wake the service worker for nothing);
    // the onChanged handler loads on demand if the user toggles it on.
    if (!prefs.visible) return;

    await ensureBuddyLoaded();
    render();
  } catch {
    console.debug("Pokebrowser: Extension context invalidated.");
  }
}
