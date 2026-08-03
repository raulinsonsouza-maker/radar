"""
Cria role/banco prospeccao no PostgreSQL local e aplica o schema.

Uso:
  set POSTGRES_ADMIN_URL=postgresql://postgres:SUA_SENHA@localhost:5432/postgres
  python scripts/setup_local_db.py

Ou edite POSTGRES_ADMIN_URL no .env
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg import sql as psql

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

ADMIN_URL = os.getenv(
    "POSTGRES_ADMIN_URL",
    "postgresql://postgres:postgres@localhost:5433/postgres",
)
APP_USER = os.getenv("POSTGRES_USER", "prospeccao")
APP_PASSWORD = os.getenv("POSTGRES_PASSWORD", "prospeccao")
APP_DB = os.getenv("POSTGRES_DB", "prospeccao")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{APP_USER}:{APP_PASSWORD}@localhost:5432/{APP_DB}",
)


def main() -> None:
    if "ALTERE_AQUI" in ADMIN_URL:
        print("Configure POSTGRES_ADMIN_URL no .env com a senha do usuário postgres.")
        print("Ex.: postgresql://postgres:SUA_SENHA@localhost:5432/postgres")
        sys.exit(1)

    print("Conectando como admin...")
    try:
        with psycopg.connect(ADMIN_URL, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (APP_USER,))
                if cur.fetchone() is None:
                    cur.execute(
                        psycopg.sql.SQL(
                            "CREATE ROLE {} LOGIN PASSWORD {}"
                        ).format(
                            psycopg.sql.Identifier(APP_USER),
                            psycopg.sql.Literal(APP_PASSWORD),
                        )
                    )
                    print(f"Role {APP_USER} criada.")
                else:
                    cur.execute(
                        psycopg.sql.SQL(
                            "ALTER ROLE {} WITH LOGIN PASSWORD {}"
                        ).format(
                            psycopg.sql.Identifier(APP_USER),
                            psycopg.sql.Literal(APP_PASSWORD),
                        )
                    )
                    print(f"Role {APP_USER} ja existia — senha atualizada.")

                cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (APP_DB,))
                if cur.fetchone() is None:
                    cur.execute(
                        psycopg.sql.SQL(
                            "CREATE DATABASE {} OWNER {} ENCODING 'UTF8'"
                        ).format(
                            psycopg.sql.Identifier(APP_DB),
                            psycopg.sql.Identifier(APP_USER),
                        )
                    )
                    print(f"Database {APP_DB} criado.")
                else:
                    print(f"Database {APP_DB} ja existia.")
    except psycopg.OperationalError as exc:
        print(f"Falha na conexao admin: {exc}")
        print("Verifique a senha do usuario postgres em POSTGRES_ADMIN_URL.")
        sys.exit(1)

    schema = (ROOT / "db" / "schema.sql").read_text(encoding="utf-8")
    print("Aplicando schema...")
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(schema)
        conn.commit()
    print("Pronto. Banco local configurado sem Docker.")


if __name__ == "__main__":
    main()
