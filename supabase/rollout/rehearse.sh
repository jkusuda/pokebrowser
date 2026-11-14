#!/usr/bin/env bash
# Rehearses the production migration on the local stack with real data: resets to the
# baseline, loads a production backup's data, then runs migrate.sh exactly as production will.
# Afterwards the local stack holds migrated production data; `npx supabase db reset` restores
# the normal seed.
#
# Usage: supabase/rollout/rehearse.sh supabase/dumps/<timestamp>.dump
set -euo pipefail
cd "$(dirname "$0")/.."

DUMP=$(realpath "${1:?usage: rehearse.sh <backup .dump file>}")
DB=supabase_db_$(sed -n 's/^project_id = "\(.*\)"/\1/p' config.toml)
admin() { docker exec -i -e PGPASSWORD=postgres "$DB" "$@" -U supabase_admin -h 127.0.0.1 -d postgres; }

npx supabase db reset --version 20261112000001 --no-seed >/dev/null 2>&1
echo "reset to the baseline"

# Production's history replaces the local one (newer CLIs add columns, so match them first);
# triggers and foreign keys stay off while loading.
admin psql -qc "truncate supabase_migrations.schema_migrations;
  alter table supabase_migrations.schema_migrations
    add column if not exists created_by text,
    add column if not exists idempotency_key text unique,
    add column if not exists rollback text[];"
admin pg_restore --data-only --disable-triggers --schema=public < "$DUMP"
admin pg_restore --data-only --schema=supabase_migrations --table=schema_migrations < "$DUMP"
admin pg_restore --data-only --disable-triggers --schema=auth --table=users --table=identities < "$DUMP" ||
  echo "warning: some auth rows didn't load (local and production auth versions differ); logins may not work"
# Trainers whose login row didn't load get a bare one, so foreign keys hold.
admin psql -qc "set session_replication_role = replica;
  insert into auth.users (id) select id from public.users u
  where not exists (select from auth.users a where a.id = u.id);"
echo "loaded production data"

rollout/migrate.sh "postgresql://postgres:postgres@host.docker.internal:54322/postgres"
