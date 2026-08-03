#!/usr/bin/env bash
# Backup diário do Postgres (ajuste cron: 0 3 * * * /path/backup_postgres.sh)
set -euo pipefail
STAMP=$(date +%Y%m%d_%H%M%S)
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-prospeccao}" "${POSTGRES_DB:-prospeccao}" \
  | gzip > "$OUT_DIR/prospeccao_$STAMP.sql.gz"
echo "Backup: $OUT_DIR/prospeccao_$STAMP.sql.gz"
# Mantém últimos 14 dias
find "$OUT_DIR" -name 'prospeccao_*.sql.gz' -mtime +14 -delete 2>/dev/null || true
