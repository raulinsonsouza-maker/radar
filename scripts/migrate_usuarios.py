"""Aplica tabela usuarios e (opcional) cria admin inicial.

Uso:
  python scripts/migrate_usuarios.py
  python scripts/migrate_usuarios.py --seed-admin
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from passlib.context import CryptContext

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://prospeccao:prospeccao@localhost:5433/prospeccao",
)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DDL = """
CREATE TABLE IF NOT EXISTS usuarios (
    id              BIGSERIAL PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    nome            TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'cliente'
                    CHECK (role IN ('admin', 'cliente')),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultimo_login    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios (email);
CREATE INDEX IF NOT EXISTS ix_usuarios_ativo ON usuarios (ativo);
"""


def seed_admin(conn: psycopg.Connection) -> None:
    email = (os.getenv("ADMIN_EMAIL") or "admin@symbius.local").strip().lower()
    password = os.getenv("ADMIN_PASSWORD") or "admin123"
    nome = os.getenv("ADMIN_NOME") or "Administrador"
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM usuarios WHERE email = %s", (email,))
        if cur.fetchone():
            print(f"Admin já existe: {email}")
            return
        cur.execute(
            """
            INSERT INTO usuarios (email, nome, password_hash, role, ativo)
            VALUES (%s, %s, %s, 'admin', TRUE)
            """,
            (email, nome, pwd_context.hash(password)),
        )
    conn.commit()
    print(f"Admin criado: {email}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed-admin", action="store_true")
    args = parser.parse_args()

    print(f"Conectando em ...@{DATABASE_URL.split('@')[-1]}")
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(DDL)
            conn.commit()
            print("Tabela usuarios OK.")
            if args.seed_admin:
                seed_admin(conn)
    except psycopg.OperationalError as exc:
        print(f"Falha: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
