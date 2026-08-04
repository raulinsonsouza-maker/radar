#!/usr/bin/env bash
# Cria A radar.symbius.com.br -> 5.75.172.83 (DNS only) via API Cloudflare.
# Uso:
#   export CF_API_TOKEN='token-com-Zone-DNS-Edit-em-symbius.com.br'
#   ./deploy/create-dns.sh
set -euo pipefail

TOKEN="${CF_API_TOKEN:?Defina CF_API_TOKEN (Zone.DNS Edit na zona symbius.com.br)}"
ZONE_NAME="${CF_ZONE_NAME:-symbius.com.br}"
RECORD_NAME="radar"
IP="${RADAR_IP:-5.75.172.83}"

ZONE_ID=$(curl -sS -H "Authorization: Bearer ${TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('success'), d; print(d['result'][0]['id'])")

EXISTING=$(curl -sS -H "Authorization: Bearer ${TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=A&name=${RECORD_NAME}.${ZONE_NAME}")

RID=$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('result') else '')" <<<"$EXISTING")

BODY=$(python3 -c "import json; print(json.dumps({'type':'A','name':'${RECORD_NAME}','content':'${IP}','ttl':1,'proxied':False}))")

if [ -n "$RID" ]; then
  echo "Atualizando registro existente $RID"
  curl -sS -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    --data "$BODY" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('success'), d; print('OK', d['result']['name'], d['result']['content'], 'proxied=', d['result']['proxied'])"
else
  echo "Criando registro A ${RECORD_NAME}.${ZONE_NAME} -> ${IP} (DNS only)"
  curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    --data "$BODY" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('success'), d; print('OK', d['result']['name'], d['result']['content'], 'proxied=', d['result']['proxied'])"
fi
