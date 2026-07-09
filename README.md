<div align="center">

<img src="src/app/icon.png" alt="Pokebrowser logo" width="140" />

# Pokebrowser

**Wild Pokémon appear as you browse the web. Catch them all!**

<img src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/1.gif" alt="Bulbasaur" height="56" />&nbsp;&nbsp;<img src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/4.gif" alt="Charmander" height="56" />&nbsp;&nbsp;<img src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/7.gif" alt="Squirtle" height="56" />&nbsp;&nbsp;<img src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif" alt="Pikachu" height="56" />&nbsp;&nbsp;<img src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/133.gif" alt="Eevee" height="56" />

[**pokebrowser.net**](https://www.pokebrowser.net)

</div>

---

## What is Pokebrowser?

Pokebrowser is a Chrome extension paired with a web app. While you surf the internet, wild Pokémon randomly pop up on the pages you visit — click to catch them, then head to your trainer profile to build your collection, fill out your Pokédex, and show off to friends. All 151 Gen 1 Pokémon are waiting.

## Features

- 🌱 **Wild encounters** — Pokémon spawn on any webpage while you browse
- ✨ **Shinies** — rare 1/512 shiny variants of every species
- 📖 **Pokédex** — track all 151 Gen 1 Pokémon, with stats, entries, and evolution lines
- 🍬 **Evolution** — earn candy with every catch and evolve your Pokémon
- 🏆 **Achievements** — unlock rewards like extra storage and special encounter tokens (legendary, mythical, shiny, type-pick)
- ⭐ **Trainer levels** — gain XP per catch and level up for candy rewards
- 🤝 **Friends** — add friends by code, view their profiles and buddy Pokémon
- 🌍 **Global leaderboards** — compete on total catches and unique sites explored
- 🔄 **Live sync** — catches made in the extension show up on your profile in real time

## Built With

| Layer | Tech |
|---|---|
| Web app | [Next.js](https://nextjs.org) · React · TypeScript · [Tailwind CSS v4](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com) |
| Extension | Chrome Extension (Manifest V3) · [Vite](https://vite.dev) · React |
| Backend | [Supabase](https://supabase.com) (Postgres, Auth, Realtime, RLS) |
| Data | [PokéAPI](https://pokeapi.co) (compiled to static data at build time) |

## Setup

This is an npm workspace monorepo: the Next.js web app at the root, the Chrome extension in `extension/`, and shared packages in `packages/`.

### 1. Web app

```bash
git clone https://github.com/jkusuda/pb-remastered.git
cd pb-remastered
npm install
cp .env.example .env   # fill in your Supabase URL/key
npm run dev            # http://localhost:3000
```

### 2. Chrome extension

```bash
cd extension
cp .env.example .env   # set VITE_WEBSITE_URL=http://localhost:3000 for local dev
npm run build
```

Then load it in Chrome:

1. Open `chrome://extensions` and enable **Developer Mode**
2. Click **Load unpacked** and select the `extension/dist/` folder
3. Copy the extension ID shown there into the root `.env` as `NEXT_PUBLIC_POKEBROWSE_EXTENSION_ID`
4. Log in at `http://localhost:3000` — the extension picks up your session automatically and encounters start spawning

## Contact

- 🐛 Found a bug? [Open an issue](https://github.com/jkusuda/pb-remastered/issues)
- 📧 Questions or beta testing: [kusuda.jordan@gmail.com](mailto:kusuda.jordan@gmail.com)

---

<div align="center">

<sub>Pokebrowser is a fan-made, non-commercial project and is not affiliated with, sponsored, or endorsed by Nintendo, GAME FREAK, or The Pokémon Company. Pokémon and Pokémon character names are trademarks of Nintendo.</sub>

</div>
