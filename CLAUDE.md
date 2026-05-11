# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is This

Pokebrowser is a Chrome extension + Next.js web app that spawns wild Pokémon encounters while users browse the web. Users catch Pokémon, build a collection, and track progress on their profile. Only Gen 1 (151) Pokémon are currently supported.

## Monorepo Structure

This is an npm workspace with three packages:

- **Root** — Next.js 16 web app (`src/`)
- **`packages/pokemon-data`** — shared TypeScript library with static Gen 1 data (bundled as `pokemon-data` workspace package)
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
`pokemon-data` exports static lookup functions (`getPokemonData`, `getPokemonName`, `getFamilyId`, `getPokemonBaseXp`) used by both the web app and the extension background script. The data is a compile-time constant — no runtime fetches.

### Extension Build
Vite builds three separate entry points into `extension/dist/assets/`:
- `popup.js` — the extension popup UI (React app)
- `content.js` — injected into every page
- `background.js` — service worker

The `extension/public/` directory (manifest, sprites) is copied verbatim into `dist/`. To test locally, load `extension/dist/` as an unpacked extension in `chrome://extensions`.

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

## Key Constants
- `extension/src/lib/constants.ts`: `WEBSITE_URL` (currently `http://localhost:3000`) and `SESSION_KEY` (`pb_session`) — update `WEBSITE_URL` for production deployments.
- Shiny rate: `1/512` (hardcoded in `background.ts`)
- Catch limit starts at 200 and grows by 200 per level-up
- XP per level: 1000 (`getLevelFromXP` in `background.ts`)
- Current Pokémon pool: Gen 1 only (dex #1–151)
