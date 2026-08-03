# Prospecção CNPJ

Sistema de prospecção de clientes com base nos dados abertos de CNPJ da Receita Federal.

- **PostgreSQL local** (sem Docker)
- **Python ETL** — amostragem agora, carga completa depois
- **FastAPI** — API de filtros
- **Vite + React** — interface de prospecção

## Pré-requisitos

- PostgreSQL 16+ (neste ambiente: **PG 17 na porta 5433**, senha do admin `postgres`)
- Python 3.12+
- Node.js 20+

## 1. Configurar o banco local

O [.env](.env) já aponta para:

```env
POSTGRES_ADMIN_URL=postgresql://postgres:postgres@localhost:5433/postgres
DATABASE_URL=postgresql://prospeccao:prospeccao@localhost:5433/prospeccao
```

```bash
python -m pip install -r requirements.txt
python scripts/setup_local_db.py
```

Cria o role/banco `prospeccao` e aplica [`db/schema.sql`](db/schema.sql).

## 2. Importar amostragem

```bash
python -m etl.import_receita --sample 5000
```

Carrega 100% das tabelas de domínio (CNAE, municípios, naturezas, países, qualificações, motivos) + amostra de estabelecimentos/empresas/simples/sócios.

## 3. Usuários (auth)

```bash
python scripts/migrate_usuarios.py --seed-admin
```

Cria a tabela `usuarios` e o admin inicial (`ADMIN_EMAIL` / `ADMIN_PASSWORD` no `.env`).

- Cadastro: só o admin cria usuários (sem self-signup).
- Acesso: `ativo` / `inativo` — inativo não entra.
- Export CSV: bloqueado para perfil `cliente` (sem botão na UI).

## 4. API + frontend

```bash
# Terminal 1
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173

| Rota | Conteúdo |
|------|----------|
| `/` | Landing pública |
| `/login` | Login |
| `/app` | Prospecção (JWT + ativo) |
| `/admin` | Gestão de usuários (só admin) |

## 5. Deploy (Docker)

```bash
# Ajuste SECRET_KEY, CORS_ORIGINS e senhas no .env
docker compose up -d --build
```

A API sobe com `SERVE_FRONTEND=1` e serve `frontend/dist`. Para HTTPS, use o exemplo em [`deploy/Caddyfile.example`](deploy/Caddyfile.example) apontando o domínio para a porta 8000.

Backup diário (no host Linux): [`scripts/backup_postgres.sh`](scripts/backup_postgres.sh).

## Carga completa (`--full`)

Filtra automaticamente para prospecção:

- só estabelecimentos **ativos** (`situacao_cadastral = 02`)
- só empresas com **capital social > 0** e que tenham estabelecimento ativo
- Simples/sócios só desses CNPJs

```bash
python -m etl.import_receita --full
```

Pode levar horas. Espaço em disco: dezenas de GB.

## Filtros

Situação, UF, município, CNAE, natureza jurídica, porte, Simples Nacional, capital, data início, telefone/e-mail, matriz, busca textual. Export CSV só para admin (API). MEI não entra na base.

## Estrutura

```
base/
db/schema.sql
scripts/setup_local_db.py
etl/import_receita.py
app/main.py
frontend/          # Vite + React
```
