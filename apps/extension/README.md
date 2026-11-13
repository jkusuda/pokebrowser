# Pokebrowser extension

Chrome MV3 extension (Vite + React). Pokémon encounters appear while you browse; the popup shows recent catches and settings. All game logic lives in the Go API (`services/api`).

## Build

From the repo root:

```bash
npm run build:local -w extension   # local stack, reads .env.localstack
npm run build -w extension         # production defaults
npm run build:store -w extension   # build + store manifest (strips localhost)
```

Load `apps/extension/dist` unpacked at `chrome://extensions`.

## Environment

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Go API base URL. Required, no default. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase project (auth only). Default to production; `build:local` requires them. |
| `VITE_WEBSITE_URL` | Web app origin for login and profile links. Defaults to production. |

Copy `.env.example` to `.env.localstack` for the local stack (`npx supabase status -o env` has the keys). Login handoff from the web app only works from `http://localhost:3000` in local builds.
