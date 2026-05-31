#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must be set}"
backup_file="${1:-backup-$(date +%Y%m%d-%H%M%S).sql}"
pg_dump "$DATABASE_URL" > "$backup_file"
echo "Backup written to $backup_file"
