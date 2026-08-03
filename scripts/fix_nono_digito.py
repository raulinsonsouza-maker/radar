"""
Insere o 9º dígito em celulares brasileiros de 8 dígitos (Anatel).
Não altera telefones fixos (8 dígitos começando em 2–5).

Uso:
  python -m scripts.fix_nono_digito
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://prospeccao:prospeccao@localhost:5433/prospeccao",
)

UPDATE_SQL = """
UPDATE estabelecimentos
SET {col} = '9' || regexp_replace({col}, '[^0-9]', '', 'g')
WHERE length(regexp_replace(COALESCE({col}, ''), '[^0-9]', '', 'g')) = 8
  AND left(regexp_replace({col}, '[^0-9]', '', 'g'), 1) IN ('6', '7', '8', '9')
"""


def fix_column(conn: psycopg.Connection, col: str) -> int:
    with conn.cursor() as cur:
        cur.execute(UPDATE_SQL.format(col=col))
        return cur.rowcount


def main() -> None:
    print(f"Conectando em ...@{DATABASE_URL.split('@')[-1]}")
    with psycopg.connect(DATABASE_URL) as conn:
        n1 = fix_column(conn, "telefone_1")
        print(f"telefone_1 atualizados: {n1:,}")
        n2 = fix_column(conn, "telefone_2")
        print(f"telefone_2 atualizados: {n2:,}")
        conn.commit()
        print(f"Concluído: {n1 + n2:,} números com 9º dígito inserido.")


if __name__ == "__main__":
    main()
