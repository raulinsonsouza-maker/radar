#!/usr/bin/env bash
set -euo pipefail
python scripts/migrate_usuarios.py --seed-admin || true
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
