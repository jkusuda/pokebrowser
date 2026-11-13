#!/usr/bin/env bash
# Checks that clients (the public key and signed-in users) can't reach game
# tables directly, only through the Go API. Needs the local stack running.
set -euo pipefail
cd "$(dirname "$0")/.."

DB=supabase_db_$(sed -n 's/^project_id = "\(.*\)"/\1/p' config.toml)
{ echo "begin;"; cat tests/client_access.sql; echo "rollback;"; } |
  docker exec -i "$DB" psql -U postgres -v ON_ERROR_STOP=1 -q

eval "$(npx supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY)=')"
status=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/rest/v1/pokemon?select=id" -H "apikey: $ANON_KEY")
if [[ "$status" == 2* ]]; then
  echo "REST API still serves public.pokemon (HTTP $status)" >&2
  exit 1
fi
echo "REST API refuses public tables (HTTP $status)"
