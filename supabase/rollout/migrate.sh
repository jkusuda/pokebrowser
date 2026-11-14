#!/usr/bin/env bash
# Moves a database that matches the production baseline onto the latest schema in ONE
# transaction: the migration history is rewritten to start at our baseline, every later
# migration is applied, and row counts are compared. Any error rolls all of it back.
#
# Usage: supabase/rollout/migrate.sh <admin database url>
#   production:  postgresql://postgres.<ref>:<password>@<session-pooler-host>:5432/postgres
#   rehearsal:   postgresql://postgres:postgres@host.docker.internal:54322/postgres
set -euo pipefail
cd "$(dirname "$0")/.."

URL=${1:?usage: migrate.sh <admin database url>}
BASELINE=20261112000001
LATEST=$(basename "$(ls migrations/*.sql | tail -1)" | cut -d_ -f1)
psql() { docker run --rm -i postgres:17.6 psql "$URL" -v ON_ERROR_STOP=1 -q "$@"; }

if [[ $(psql -tAc "select count(*) from supabase_migrations.schema_migrations where version = '$LATEST'") != 0 ]]; then
  echo "Already migrated (history has $LATEST). Nothing to do."
  exit 0
fi

{
  # Rows that must survive. achievement_unlocks may grow: old profile flags become unlocks.
  echo "create temp table before_counts as select * from (values
    ('users', (select count(*) from public.users), false),
    ('pokemon', (select count(*) from public.pokemon), false),
    ('pokedex', (select count(*) from public.pokedex), false),
    ('tokens', (select count(*) from public.tokens), false),
    ('events', (select count(*) from public.events), false),
    ('achievement_unlocks', (select count(*) from public.achievement_unlocks), true)
  ) as t(tbl, n, may_grow);"

  echo "delete from supabase_migrations.schema_migrations where version <= '$BASELINE';"
  for f in migrations/*.sql; do
    file=$(basename "$f" .sql)
    version=${file%%_*}
    if [[ "$version" > "$BASELINE" ]]; then
      echo "\\echo applying $file"
      cat "$f"
      echo
    fi
    echo "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '${file#*_}');"
  done

  echo "do \$\$
  declare r record; after bigint;
  begin
    for r in select * from before_counts loop
      execute format('select count(*) from public.%I', r.tbl) into after;
      raise notice '% rows: % before, % after', r.tbl, r.n, after;
      if after < r.n or (after > r.n and not r.may_grow) then raise exception '% row count changed', r.tbl; end if;
    end loop;
    if (select count(*) from public.users) <> (select count(*) from public.user_settings)
      or (select count(*) from public.users) <> (select count(*) from public.user_limits) then
      raise exception 'every user needs a user_settings and user_limits row';
    end if;
  end
  \$\$;"
} | psql --single-transaction

echo "Migrated to $LATEST."
