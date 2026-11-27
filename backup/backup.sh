#!/bin/sh
# Nightly Postgres backup, run by the Railway cron service `backup` (see .railway/railway.ts).
# Dumps the database in pg_dump's custom format and uploads it to the private R2 bucket. The
# bucket deletes dumps after 31 days and locks them for 30, so nothing here deletes anything.
# healthchecks.io is pinged at start, success and failure; it emails if a night is missed.
# Restore: see README ("Backups").
set -eu

ping() { # ping [suffix]: best effort, never fails the backup
  if [ -n "${HC_PING_URL:-}" ]; then curl -fsS -m 10 --retry 3 "${HC_PING_URL}${1:-}" >/dev/null || true; fi
}
fail() { echo "backup failed: $1" >&2; ping /fail; exit 1; }

ping /start
stamp=$(date -u +%Y-%m-%dT%H-%M-%SZ)
file="/tmp/abugida-$stamp.dump"

pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$file" || fail "pg_dump"
size=$(wc -c < "$file")

curl -fsS --retry 3 \
  --aws-sigv4 "aws:amz:auto:s3" \
  --user "$R2_ACCESS_KEY_ID:$R2_SECRET_ACCESS_KEY" \
  --upload-file "$file" \
  "${R2_ENDPOINT%/}/$R2_BUCKET/postgres/abugida-$stamp.dump" || fail "upload to R2"

echo "backup ok: postgres/abugida-$stamp.dump ($size bytes)"
ping
