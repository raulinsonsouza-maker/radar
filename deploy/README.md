# Deploy Radar — VPS Swarm + Traefik

Domínio: `https://radar.symbius.com.br`  
Stack: `radar` (serviços `radar_api` / `radar_db` no Swarm: `radar_api`, `radar_db`)

## Pré-requisitos

- Docker Swarm ativo e rede externa `traefik_proxy`
- Traefik com entrypoints `web` / `websecure` e certresolver `letsencryptresolver`
- DNS A `radar.symbius.com.br` → IP da VPS (Cloudflare DNS-only no ACME inicial)
- Imagem `radar-api:latest` buildada neste nó

## Setup na VPS

```bash
sudo mkdir -p /opt/apps/radar/backups
cd /opt/apps/radar
git clone https://github.com/raulinsonsouza-maker/radar.git .
cp deploy/.env.example .env
# editar .env com senhas fortes

docker build -t radar-api:latest --target production .
set -a && source .env && set +a
docker stack deploy -c deploy/stack.yml radar
```

Nota: `docker stack deploy` **não** carrega `env_file` do compose da mesma forma que o Compose v2 em todos os casos. Exporte as variáveis do `.env` no shell antes do deploy (`set -a; source .env; set +a`) para interpolação de `${POSTGRES_PASSWORD}` etc. As labels Traefik estão fixas no `stack.yml`.

Alternativa estável: colocar senhas diretamente no `stack.yml` só no servidor (fora do git) ou usar Docker configs/secrets.

## Restore do dump (dados iguais ao local)

No PC local (Postgres na 5433):

```bash
pg_dump -Fc -h 127.0.0.1 -p 5433 -U prospeccao -d prospeccao -f radar.dump
scp radar.dump root@VPS:/opt/apps/radar/backups/
```

Na VPS:

```bash
# descobrir container do db
CID=$(docker ps -q -f name=radar_db)
docker exec -i "$CID" pg_restore -U prospeccao -d prospeccao --clean --if-exists --no-owner < /opt/apps/radar/backups/radar.dump
# ou copiar o arquivo para dentro do container e restaurar
docker cp /opt/apps/radar/backups/radar.dump "$CID":/tmp/radar.dump
docker exec "$CID" pg_restore -U prospeccao -d prospeccao --clean --if-exists --no-owner /tmp/radar.dump
docker service update --force radar_api
```

## Atualizar código

```bash
cd /opt/apps/radar
git pull
docker build -t radar-api:latest --target production .
docker service update --image radar-api:latest --force radar_api
```

## Health

- https://radar.symbius.com.br/api/health
- Landing + login admin

## Remover stack (cuidado)

```bash
docker stack rm radar
# volume radar_pgdata permanece até docker volume rm
```
