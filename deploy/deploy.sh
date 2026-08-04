#!/usr/bin/env bash
# Deploy / update stack radar no Swarm (rodar em /opt/apps/radar)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Falta .env — copie de deploy/.env.example e preencha."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD obrigatório}"
: "${SECRET_KEY:?SECRET_KEY obrigatório}"
: "${DATABASE_URL:?DATABASE_URL obrigatório}"

echo "Building radar-api:latest ..."
docker build -t radar-api:latest --target production .

echo "Deploying stack radar ..."
docker stack deploy -c deploy/stack.yml radar

echo "OK. Serviços:"
docker service ls | grep -E 'NAME|radar_' || true
