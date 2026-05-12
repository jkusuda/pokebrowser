# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is This

Pokebrowser is a Chrome extension + Next.js web app that spawns wild Pokémon encounters while users browse the web. Users catch Pokémon, build a collection, and track progress on their profile. Only Gen 1 (151) Pokémon are currently supported.

## Monorepo Structure

This is an npm workspace with four packages:

- **Root** — Next.js 16 web app (`src/`)
- **`packages/pokemon-data`** — static Gen 1 data + generation helpers, consumed by both the web app and the extension
- **`packages/shared-types`** — single source of truth for Supabase row types (`User`, `Pokemon`, `Candy`, `PokedexUnlock`, `Friend`, `RecentPokemon`). `src/types/index.ts` re-exports from here
- **`extension/`** — Chrome extension built with Vite + React

## Commands

### Web App (root)
```bash
npm run dev        # Next.js dev server
npm run build      # Production build
npm run lint       # ESLint
```

### Chrome Extension (`extension/`)
```bash
npm run dev        # Vite dev server (popup preview only)
npm run build      # Build to extension/dist/ — load this folder in Chrome
npm run lint       # ESLint
```

### Pokemon Data Package (`packages/pokemon-data/`)
```bash
node packages/pokemon-data/scripts/generate.mjs   # Re-fetch from PokeAPI and regenerate pokemon.ts
```
`packages/pokemon-data/src/pokemon.ts` is auto-generated — do not edit it manually.

## Architecture

### Auth Flow (Web ↔ Extension)
The web app and extension share a Supabase session via `postMessage`:
1. `ExtensionAuthBridge` (`src/components/auth/ExtensionAuthBridge.tsx`) — invisible client component in the root layout; listens to `supabase.auth.onAuthStateChange` and posts `POKEBROWSE_AUTH_SUCCESS` / `POKEBROWSE_AUTH_SIGNOUT` messages.
2. `extension/src/content.ts` — content script that listens for those messages and relays them to the background script via `chrome.runtime.sendMessage`.
3. `extension/src/background.ts` — stores the Supabase JWT tokens in `chrome.storage.local` under the key `pb_session` and handles all Supabase operations (catch logic, XP, candies).

The extension **never** calls Next.js API routes. All database writes from the extension go directly to Supabase from the background script.

### Encounter Flow
On every page load, `content.ts` fires `tryEncounter()`:
- Sends `GET_SESSION` to the background; background validates the stored token against Supabase, checks the box capacity, and returns a randomly rolled encounter.
- If the user is logged in and their box is not full, `showEncounterPopup()` renders a Shadow DOM overlay (so host-page CSS can't interfere).
- Clicking "Catch" sends `PERFORM_CATCH` to the background, which inserts into `pokemon`, `pokedex` (first catch of a species), `candies` (+3 per catch), and updates `users.xp` / `users.level` / `users.catch_limit`.

### Web App Pages
- `/` — landing page (server component, checks auth to show Login vs Profile button)
- `/profile` — trainer profile (server component, fetches all data via `getTrainerData` then passes to `ProfileContent` client component)
- `/login`, `/signup` — auth pages
- `/auth/callback` — Supabase OAuth callback route

### API Routes (`src/app/api/`)
These are thin Next.js routes that authenticate via the server-side Supabase client and delegate to helpers in `src/lib/queries.ts`:
- `GET /api/trainer` — fetch full trainer data
- `POST /api/trainer/update` — update trainer name / avatar
- `POST /api/pokemon/nickname` — rename a caught Pokémon
- `POST /api/pokemon/release` — delete a caught Pokémon
- `POST /api/auth/logout` — server-side sign out

### Supabase Tables
Defined by the TypeScript interfaces in `src/types/index.ts`:
- `users` — trainer profile (xp, level, catch_limit, avatar_id, friend_code)
- `pokemon` — individual caught instances (pokedex_number, nickname, is_shiny, caught_on)
- `pokedex` — one row per unlocked species per user
- `candies` — candy count per evolutionary family per user (keyed by the family's base Pokémon id)
- `friends` — friendship relationships with `pending | accepted` status

### Supabase Clients
- `src/lib/supabase/server.ts` — server-side client (for Server Components and API routes)
- `src/lib/supabase/client.ts` — browser client (for Client Components)
- `src/lib/supabase/middleware.ts` — session refresh middleware

### Shared Pokemon Data Package
`pokemon-data` exports:
- Static lookup functions: `getPokemonData`, `getPokemonName`, `getFamilyId`, `getPokemonBaseXp`
- Generation helpers (`packages/pokemon-data/src/generations.ts`): `GENERATIONS`, `getGenerationRange`, `getPokemonsByGeneration`, `getRandomPokemonId(generation)` — used by `background.ts` for encounter rolls

The data is a compile-time constant — no runtime fetches.

### Extension Build
Two-pass Vite build (run together as `npm run build` in `extension/`):
1. `vite build` (`vite.config.ts`) — builds `popup.js` (React app) and `background.js` (service worker) into `extension/dist/assets/`. Chunking is allowed here.
2. `vite build --config vite.content.config.ts` — separate IIFE build for `content.js` with `inlineDynamicImports: true` and `emptyOutDir: false`. Content scripts can't load chunks at runtime, so this entry point must be fully bundled.

The `extension/public/` directory (manifest, sprites) is copied verbatim into `dist/`. To test locally, load `extension/dist/` as an unpacked extension in `chrome://extensions`.

Extension source layout under `extension/src/lib/`:
- `config.ts` — Zod-validated env vars + `CONFIG.GAME` constants (see Key Constants below)
- `animation.ts` — Pokemon catch/release animation primitives (`runCatchAnimation`, `playAnimation`, `playFrameSequence`, `waitForAnimationEnd`)
- `sprites.ts` — `getPokemonSprite(pokedexNumber, isShiny)` — shared by `content.ts` and the popup
- `supabase.ts` — Supabase client wired to `CONFIG.SUPABASE_URL` / `CONFIG.SUPABASE_KEY`

## Security Practices

### Error Responses
All API routes catch errors with `console.error` (full detail server-side) and return only a generic `{ "error": "Internal server error" }` (HTTP 500) to the client. Never expose Supabase/Postgres error messages, constraint names, or column hints in responses.

### Input Validation
Write routes validate all user-supplied fields before touching the database:

| Route | Field | Rule |
|---|---|---|
| `POST /api/trainer/update` | `trainerName` | string, 1–24 chars |
| `POST /api/trainer/update` | `avatarId` | string, 1–8 chars |
| `POST /api/pokemon/nickname` | `pokemonId` | valid UUID (regex) |
| `POST /api/pokemon/nickname` | `nickname` | string, 1–12 chars |
| `POST /api/pokemon/release` | `pokemonId` | valid UUID (regex) |

UUID validation regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

Invalid input returns HTTP 400 with a descriptive message (safe to expose since it contains no server internals).

## UI / Design System

The web app uses **shadcn/ui** (new-york style, Tailwind v4, neutral base) layered with a Pokebrowser "chunky neo-brutalist" game look. Adding shadcn components: `npx shadcn@latest add <component>` (config in `components.json`).

### Tokens (`src/app/globals.css`)
- `@theme` block defines the Pokebrowser palette as Tailwind utilities (`bg-pb-grass`, `bg-pb-pine`, `shadow-pb`, etc.). Sources of truth for the green palette: `--color-pb-bg #e0f4d9`, `--color-pb-leaf #ecf5e8`, `--color-pb-grass #9dcd9d`, `--color-pb-grass-deep #8abf8a`, `--color-pb-pine #4a8a44`, `--color-pb-forest #2d5a27`, `--color-pb-poppy #c0392b`.
- `:root` + `@theme inline` blocks wire shadcn HSL tokens (`--primary`, `--card`, etc.) to the Pokebrowser palette so default shadcn components inherit the game look.
- `@layer components` defines `.text-emboss`, `.text-emboss-sm`, `.text-emboss-lg` — embossed white uppercase text with stroke + drop-shadow. Use these instead of inline `WebkitTextStroke` + `textShadow` styles in new code.

### Components
- `src/components/ui/button.tsx` — CVA variants: `default | outline | ghost | link | game`. The `game` variant pairs with `tone`: `primary` (pb-grass-deep + white), `danger` (red), `neutral` (pb-bg + black), `forest` (pb-pine + white), `mint` (pb-grass + black). Sizes `sm | md | lg | icon`. `asChild` works via Radix `Slot` for wrapping `<Link>`.
- `src/components/ui/card.tsx` — CVA variants: `default | game`. The `game` variant supports `tone` (`cream | white | leaf | glass | grass`), `size` (`sm | md | lg` — controls padding + gap), and `shadow` (`sm | md | lg | none`). Composable subcomponents: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- `src/lib/utils.ts` — `cn(...inputs)` helper (clsx + tailwind-merge); always use this when composing classNames so overrides resolve correctly.
- `/style-guide` (`src/app/style-guide/page.tsx`) — side-by-side visual reference of every Button/Card variant next to the inline-styled originals. Update it when you add a new variant.

### When to use a variant vs. inline classes
Use Button/Card variants for chunky game-style panels and buttons (border-4, hard-offset shadow, embossed text). Leave inline classes for one-off palettes that don't fit (the teal Pokedex device chrome, dynamic type-color cards in `PokemonDetailsPanel`, flat color-block tab selectors). Don't add a new tone/variant just to support one usage — override with `className` instead.

## Key Constants

### Web app
- Shiny rate: `1/512`
- Catch limit starts at 200 and grows by 200 per level-up
- XP per level: 1000

### Extension (`extension/src/lib/config.ts`)
All extension-side constants live in the Zod-validated `CONFIG` object:
- `CONFIG.SUPABASE_URL`, `CONFIG.SUPABASE_KEY` — pulled from `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` with inline fallback defaults
- `CONFIG.WEBSITE_URL` — currently `http://localhost:3000`; update for production deployments
- `CONFIG.SESSION_KEY` — `pb_session`, the `chrome.storage.local` key for the cached Supabase session
- `CONFIG.GAME.SHINY_RATE` — `1/512`
- `CONFIG.GAME.ENCOUNTER_RATE` — `1.0`
- `CONFIG.GAME.CATCH_COOLDOWN_MS` — `1500`
- `CONFIG.GAME.PENDING_ENCOUNTER_TTL_MS` — `5 * 60 * 1000`
- `CONFIG.GAME.DEFAULT_CATCH_LIMIT` — `200`
- `CONFIG.GAME.CURRENT_GENERATION` — `1` (drives `getRandomPokemonId` rolls in `background.ts`)
