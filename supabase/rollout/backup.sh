#!/usr/bin/env bash
# Full logical backup (schema + data) of the public, auth and migration-history schemas.
# Writes supabase/dumps/<timestamp>.dump (gitignored); restore with pg_restore.
#
# Usage: supabase/rollout/backup.sh <admin database url>
set -euo pipefail
cd "$(dirname "$0")/.."

URL=${1:?usage: backup.sh <admin database url>}
mkdir -p dumps
OUT=dumps/$(date +%Y%m%d-%H%M%S).dump

docker run --rm postgres:17.6 pg_dump "$URL" -Fc \
  --schema=public --schema=auth --schema=supabase_migrations > "$OUT"

echo "Wrote $OUT ($(du -h "$OUT" | cut -f1))"
docker run --rm -i postgres:17.6 pg_restore -l < "$OUT" | grep -c 'TABLE DATA' | xargs echo "tables with data:"
