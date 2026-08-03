"""
Remove CNPJs MEI (opcao_mei = 'S') da base de prospecção.

Uso:
  python -m scripts.purge_mei
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

from etl.import_receita import purge_mei  # noqa: E402

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://prospeccao:prospeccao@localhost:5433/prospeccao",
)


def main() -> None:
    print(f"Conectando em ...@{DATABASE_URL.split('@')[-1]}")
    with psycopg.connect(DATABASE_URL) as conn:
        stats = purge_mei(conn)
        print(
            f"Concluído: {stats.get('mei_cnpjs', 0):,} CNPJs MEI removidos "
            f"(estab={stats.get('estabelecimentos', 0):,}, "
            f"empresas={stats.get('empresas', 0):,})."
        )


if __name__ == "__main__":
    main()
