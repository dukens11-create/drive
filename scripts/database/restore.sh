#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must be set}"
backup_file="${1:?Usage: restore.sh <backup-file>}"
psql "$DATABASE_URL" < "$backup_file"
echo "Restore completed from $backup_file"
