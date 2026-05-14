# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is This

Pokebrowser is a Chrome extension + Next.js web app that spawns wild Pokémon encounters while users browse the web. Users catch Pokémon, build a collection, earn achievements, and track progress on their profile. Only Gen 1 (151) Pokémon are currently supported.

## Monorepo Structure

This is an npm workspace with four packages:

- **Root** — Next.js 16 web app (`src/`)
- **`packages/pokemon-data`** — static Gen 1 data + generation helpers, consumed by both the web app and the extension
- **`packages/shared-types`** — single source of truth for Supabase row types (`User`, `Pokemon`, `Candy`, `PokedexUnlock`, `Friend`, `RecentPokemon`, `UserStats`, `AchievementUnlock`, `Token`). `src/types/index.ts` re-exports from here
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
3. `extension/src/background.ts` — stores the Supabase JWT tokens in `chrome.storage.local` under the key `pb_session` and handles all Supabase operations (catch logic, XP, candies, stats, tokens).

The extension **never** calls Next.js API routes. All database writes from the extension go directly to Supabase from the background script.

### Encounter Flow
On every page load, `content.ts` fires `tryEncounter()`:
- Sends `GET_SESSION` to the background; background validates the stored token, checks box capacity, and queries for any active encounter token (`tokens` table, `used_at IS NULL`).
- If a token is available it overrides the random roll (see Token Encounter Flow below). The resulting `PendingEncounter` stores `tokenId?` so PERFORM_CATCH can mark it used.
- If the user is logged in and their box is not full, `showEncounterPopup()` renders a Shadow DOM overlay (so host-page CSS can't interfere).
- Clicking "Catch" sends `PERFORM_CATCH` to the background, which:
  1. Inserts into `pokemon`, `pokedex` (first catch of a species), `candies` (+3 per catch), and updates `users.xp` / `users.level` / `users.catch_limit`.
  2. Calls `update_catch_stats` RPC (non-blocking, fire-and-forget) to update `user_stats` and unlock any newly earned achievements.
  3. Marks the token's `used_at` if one was consumed.

### Token Encounter Flow
In `GET_SESSION`, the background fetches the first available token (`used_at IS NULL`, ordered by `created_at`). Token type controls how the encounter is rolled:

| Token type | Encounter pool |
|---|---|
| `legendary` | Random from `[144, 145, 146, 150, 151]` |
| `mythical` | Always 151 (Mew) |
| `shiny` | Normal random roll, forced `isShiny = true` |
| `type_pick` with `type_filter` set | Random from all Gen 1 ids matching that type |
| `type_pick` with `type_filter = null` | Token skipped — normal random roll (user hasn't chosen a type yet) |

### Web App Pages
- `/` — landing page (server component, checks auth to show Login vs Profile button)
- `/profile` — trainer profile (server component, fetches all data via `getTrainerData` then passes to `ProfileContent` client component)
- `/login`, `/signup` — auth pages
- `/auth/callback` — Supabase OAuth callback route

### API Routes (`src/app/api/`)
These are thin Next.js routes that authenticate via the server-side Supabase client and delegate to helpers in `src/lib/queries.ts`:
- `GET /api/trainer` — fetch full trainer data
- `POST /api/trainer/update` — update trainer name / avatar; calls `check_action_achievements` for changed fields
- `POST /api/pokemon/nickname` — rename a caught Pokémon; calls `check_action_achievements('nickname')`
- `POST /api/pokemon/release` — delete a caught Pokémon; calls `check_action_achievements('release')`
- `POST /api/friends/accept` — accept a friend request; calls `check_action_achievements('friend_accept')`
- `POST /api/achievements/claim` — mark an earned achievement as claimed, apply storage reward and grant token
- `GET /api/achievements` — fetch all achievement unlocks for the authed user
- `POST /api/tokens/select-type` — set `type_filter` on a `type_pick` token
- `POST /api/rewards/claim-candy` — claim a level-up candy pick (decrements `unclaimed_candy_levels`, grants +10 candies)
- `POST /api/auth/logout` — server-side sign out

### Achievement System

Achievement definitions are **static TypeScript constants** in `src/lib/achievements-data.ts` — no `achievements` database table. Each `AchievementDef` has: `id`, `label`, `description`, `category`, `trigger`, `threshold`, `storageReward`, `tokenReward`.

**Important:** `achievements-data.ts` is imported by both client components and server-side API routes/queries. It must not contain static image imports (Next.js `import foo from "*.png"` only works client-side).

Sprite images live in `src/assets/achievements/` (17 PNG files). The mapping from achievement ID → sprite is defined entirely inside `src/components/achievements/AchievementCard.tsx` (a `"use client"` component), which is the only place those imports live.

Achievement unlocks are recorded in the `achievement_unlocks` table. `claimed_at IS NULL` means earned but reward not yet collected. The AchievementsTab surfaces a "Claim" button for these rows — no polling needed, state is derived from the server-fetched data on profile load.

**Claim flow (`POST /api/achievements/claim`):**
1. Verify `achievement_unlocks` row exists for the user and `claimed_at IS NULL`
2. Set `claimed_at = now()`
3. If `storageReward > 0`: call `increment_catch_limit` RPC
4. If `tokenReward` set: insert into `tokens` (with `type_filter = null` for `type_pick`)

**Candy reward flow (`POST /api/rewards/claim-candy`):**
- Triggered on profile load when `users.unclaimed_candy_levels > 0` (incremented by the `trg_level_up_candy` DB trigger on every level-up)
- Uses an optimistic lock: `.eq("unclaimed_candy_levels", currentLevels)` to prevent double-claiming under concurrent requests
- Grants +10 candies to the chosen species family via `increment_candy` RPC

### Supabase Tables
Defined by the TypeScript interfaces in `packages/shared-types/src/index.ts`:
- `users` — trainer profile (xp, level, catch_limit, avatar_id, friend_code, **unclaimed_candy_levels**)
- `pokemon` — individual caught instances (pokedex_number, nickname, is_shiny, caught_on)
- `pokedex` — one row per unlocked species per user
- `candies` — candy count per evolutionary family per user (keyed by the family's base Pokémon id)
- `friends` — friendship relationships with `pending | accepted` status
- `user_stats` — persistent lifetime catch statistics that survive Pokémon releases (total_catches, caught_websites, types_caught, current_streak, longest_streak, last_catch_date, total_releases, has_nicknamed, trainer_name_changed, avatar_changed)
- `achievement_unlocks` — one row per achievement earned; `claimed_at` NULL until reward is collected
- `tokens` — encounter modifier tokens (legendary, mythical, type_pick, shiny); `used_at` NULL while available; `type_filter` NULL on type_pick until user selects a type

### Supabase RPCs
- `update_catch_stats(p_is_shiny, p_is_legendary, p_types, p_caught_on)` — called by the extension after every successful catch; updates `user_stats` counters, streak, and checks/unlocks all catch-triggered achievements. Returns array of newly unlocked achievement IDs.
- `check_action_achievements(p_trigger)` — called by API routes after non-catch user actions (`release`, `nickname`, `friend_accept`, `trainer_name_change`, `avatar_change`). Updates the relevant `user_stats` flag and unlocks matching achievements. Returns array of newly unlocked achievement IDs.
- `increment_catch_limit(p_user_id, p_amount)` — atomically increases `users.catch_limit`; called on achievement claim.
- `increment_candy(p_user_id, p_pokedex_number, p_amount)` — upserts a candy row; called on level-up candy claim.
- `_try_unlock_achievement(p_user_id, p_achievement_id, p_condition)` — internal helper; inserts into `achievement_unlocks` with `ON CONFLICT DO NOTHING`; returns the ID if newly inserted.

### Supabase Triggers
- `trg_level_up_candy` (on `users BEFORE UPDATE OF level`) — increments `unclaimed_candy_levels` by the number of levels gained.

### Supabase Clients
- `src/lib/supabase/server.ts` — server-side client (for Server Components and API routes)
- `src/lib/supabase/client.ts` — browser client (for Client Components)
- `src/lib/supabase/middleware.ts` — session refresh middleware

### Shared Pokemon Data Package
`pokemon-data` exports:
- Static lookup functions: `getPokemonData`, `getPokemonName`, `getFamilyId`, `getPokemonBaseXp`
- Generation helpers (`packages/pokemon-data/src/generations.ts`): `GENERATIONS`, `getGenerationRange`, `getPokemonsByGeneration`, `getRandomPokemonId(generation)` — used by `background.ts` for encounter rolls

The data is a compile-time constant — no runtime fetches.

### Key Shared Utilities (`src/lib/`)
- `utils.ts` — `cn(...inputs)` helper (clsx + tailwind-merge); always use this when composing classNames
- `achievements-data.ts` — `ACHIEVEMENTS` array, `ACHIEVEMENT_BY_ID` lookup, `ACHIEVEMENTS_BY_CATEGORY` grouping, `CATEGORY_LABELS`; **no image imports** (server-safe)
- `types.ts` — `GEN1_TYPES` const array (17 type strings) and `Gen1Type` union; single source of truth used by `TypePickerModal` and the `select-type` API route validation

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
| `POST /api/achievements/claim` | `achievementId` | non-empty string |
| `POST /api/tokens/select-type` | `tokenId` | valid UUID (regex) |
| `POST /api/tokens/select-type` | `typeName` | must be a member of `GEN1_TYPES` |
| `POST /api/rewards/claim-candy` | `pokedexNumber` | integer 1–151 |

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
- Catch limit starts at 200 and grows per achievement reward
- XP per level: 1000
- Gen 1 type count: 17 (defined in `GEN1_TYPES` in `src/lib/types.ts`)
- Gen 1 Pokédex size: 151
- Legendary Pokémon IDs: `[144, 145, 146, 150, 151]` (defined in `extension/src/background.ts` as `LEGENDARY_IDS`)

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
