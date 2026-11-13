#!/usr/bin/env bash
# Checks the schema migrations carry old-shaped data across correctly:
# reset to the baseline, load legacy_fixture.sql, apply the later migrations,
# run legacy_checks.sql, then reset back to the latest schema.
set -euo pipefail
cd "$(dirname "$0")/.."

BASELINE=20261112000100
DB=supabase_db_$(sed -n 's/^project_id = "\(.*\)"/\1/p' config.toml)
psql() { docker exec -i "$DB" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

npx supabase db reset --version "$BASELINE" >/dev/null 2>&1
psql < tests/legacy_fixture.sql

for f in migrations/*.sql; do
  v=$(basename "$f" | cut -d_ -f1)
  if [[ "$v" > "$BASELINE" ]]; then
    echo "applying $(basename "$f")"
    psql --single-transaction < "$f"
  fi
done

psql < tests/legacy_checks.sql
npx supabase db reset >/dev/null 2>&1
echo "reset to latest schema"
