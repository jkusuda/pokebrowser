<div align="center">

<img src="apps/web/src/app/icon.png" alt="Pokebrowser logo" width="140" />

# Pokebrowser

**Wild Pokémon appear as you browse the web. Catch them all!**

<img src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/1.gif" alt="Bulbasaur" height="56" />&nbsp;&nbsp;<img src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/4.gif" alt="Charmander" height="56" />&nbsp;&nbsp;<img src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/7.gif" alt="Squirtle" height="56" />&nbsp;&nbsp;<img src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif" alt="Pikachu" height="56" />&nbsp;&nbsp;<img src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/133.gif" alt="Eevee" height="56" />

[**pokebrowser.net**](https://www.pokebrowser.net)

</div>

---

## What is Pokebrowser?

Pokebrowser is a Chrome extension paired with a web app. While you surf the internet, wild Pokémon randomly pop up on the pages you visit — click to catch them, then head to your trainer profile to build your collection, fill out your Pokédex, and show off to friends. All 386 Pokémon from Kanto, Johto and Hoenn are waiting.

## Features

- 🌱 **Wild encounters** — Pokémon spawn on any webpage while you browse
- ✨ **Shinies** — rare 1/512 shiny variants of every species
- 📖 **Pokédex** — track all 386 Kanto, Johto and Hoenn Pokémon, with stats, entries, and evolution lines
- 🍬 **Evolution** — earn candy with every catch and evolve your Pokémon
- 🏆 **Achievements** — unlock rewards like extra storage and special encounter tokens (legendary, mythical, shiny, type-pick)
- ⭐ **Trainer levels** — gain XP per catch and level up for candy rewards
- 🤝 **Friends** — add friends by code, view their profiles and buddy Pokémon
- 🌍 **Global leaderboards** — compete on total catches and unique sites explored
- 🔄 **Live sync** — catches made in the extension show up on your profile in real time

## Built With

| Layer | Tech |
|---|---|
| Web app | [Next.js](https://nextjs.org) · React · TypeScript · [Tailwind CSS v4](https://tailwindcss.com) |
| Extension | Chrome Extension (Manifest V3) · [Vite](https://vite.dev) · React |
| API | [Go](https://go.dev) · pgx (all game rules, served to both clients) |
| Platform | [Supabase](https://supabase.com) (Postgres, Auth, Realtime) |
| Data | [PokéAPI](https://pokeapi.co) (compiled to static data at build time) |

## Setup

An npm workspace monorepo: `apps/web` (Next.js), `apps/extension` (Chrome extension), `services/api` (Go API), `packages/*` (shared TypeScript) and `supabase/` (schema, seed, tests). Needs Node 24, Go and Docker. See [ARCHITECTURE.md](ARCHITECTURE.md) for how it fits together.

```bash
git clone https://github.com/jkusuda/pokebrowser.git
cd pokebrowser
npm install
npx supabase start && npx supabase db reset   # local Postgres, Auth and seed data
```

Copy each `.env.example` next to it (`services/api/.env`, `apps/web/.env.local`, `apps/extension/.env.localstack`) and fill in the keys from `npx supabase status -o env`. Then run each part:

```bash
cd services/api && make run            # API on :8080
cd apps/web && npx next dev -p 3000    # web app on http://localhost:3000
npm run build:local -w extension       # extension build in apps/extension/dist
```

Load the extension: open `chrome://extensions`, enable **Developer Mode**, click **Load unpacked** and pick `apps/extension/dist`. Put its ID in `apps/web/.env.local` as `NEXT_PUBLIC_POKEBROWSE_EXTENSION_ID`, then log in at http://localhost:3000 as a seeded trainer (`supabase/seed/trainers.sql`). The extension picks up the session and encounters start.

## Contact

- 🐛 Found a bug? [Open an issue](https://github.com/jkusuda/pokebrowser/issues)
- 📧 Questions or beta testing: [kusuda.jordan@gmail.com](mailto:kusuda.jordan@gmail.com)

---

<div align="center">

<sub>Pokebrowser is a fan-made, non-commercial project and is not affiliated with, sponsored, or endorsed by Nintendo, GAME FREAK, or The Pokémon Company. Pokémon and Pokémon character names are trademarks of Nintendo.</sub>

</div>
