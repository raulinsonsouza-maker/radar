"""
Gera árvore de nichos a partir da tabela cnaes (cobertura 100%).

Uso:
  python -m scripts.seed_nichos
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.taxonomia import (  # noqa: E402
    limpar_descricao_cnae,
    load_divisoes,
    load_nicho_overrides,
    slugify,
)

load_dotenv(ROOT / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://prospeccao:prospeccao@localhost:5433/prospeccao",
)


def seed_nichos(conn: psycopg.Connection) -> dict[str, int]:
    divisoes = load_divisoes()
    overrides = load_nicho_overrides()

    with conn.cursor() as cur:
        cur.execute("SELECT codigo, descricao FROM cnaes ORDER BY codigo")
        cnaes = cur.fetchall()

    if not cnaes:
        raise RuntimeError("Tabela cnaes vazia — importe os domínios antes de gerar nichos.")

    parents: dict[str, dict] = {}
    children: list[dict] = []
    mappings: list[tuple[str, str, str]] = []

    for codigo, descricao in cnaes:
        codigo = codigo.strip()
        divisao = codigo[:2]
        parent_slug = f"div-{divisao}"

        if parent_slug not in parents:
            info = divisoes.get(divisao, {})
            nome_oficial = info.get("oficial") or f"Divisão {divisao}"
            nome_amigavel = info.get("amigavel") or nome_oficial
            parents[parent_slug] = {
                "slug": parent_slug,
                "nome_amigavel": nome_amigavel,
                "nome_oficial": nome_oficial,
                "ordem": int(divisao),
                "prefixo": divisao,
            }
            mappings.append((parent_slug, "prefixo", divisao))

        base_slug = slugify(overrides.get(codigo) or limpar_descricao_cnae(descricao))
        child_slug = f"{parent_slug}-{codigo}"
        # slug legível + código para unicidade
        if base_slug and base_slug != "item":
            child_slug = f"{base_slug}-{codigo}"

        nome_amigavel = overrides.get(codigo) or limpar_descricao_cnae(descricao)
        children.append(
            {
                "slug": child_slug,
                "nome_amigavel": nome_amigavel,
                "nome_oficial": descricao,
                "parent_slug": parent_slug,
                "ordem": int(codigo),
            }
        )
        mappings.append((child_slug, "codigo", codigo))

    with conn.cursor() as cur:
        cur.execute("DELETE FROM nicho_cnaes")
        cur.execute("DELETE FROM nichos")

        for p in sorted(parents.values(), key=lambda x: x["ordem"]):
            cur.execute(
                """
                INSERT INTO nichos (slug, nome_amigavel, nome_oficial, parent_slug, ordem)
                VALUES (%s, %s, %s, NULL, %s)
                """,
                (p["slug"], p["nome_amigavel"], p["nome_oficial"], p["ordem"]),
            )

        for c in children:
            cur.execute(
                """
                INSERT INTO nichos (slug, nome_amigavel, nome_oficial, parent_slug, ordem)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    c["slug"],
                    c["nome_amigavel"],
                    c["nome_oficial"],
                    c["parent_slug"],
                    c["ordem"],
                ),
            )

        for nicho_slug, tipo, valor in mappings:
            cur.execute(
                """
                INSERT INTO nicho_cnaes (nicho_slug, tipo, valor)
                VALUES (%s, %s, %s)
                """,
                (nicho_slug, tipo, valor),
            )

        cur.execute(
            """
            SELECT COUNT(*) AS total_cnaes,
                   (SELECT COUNT(*) FROM nicho_cnaes WHERE tipo = 'codigo') AS mapeados
            FROM cnaes
            """
        )
        row = cur.fetchone()

    conn.commit()

    total = row[0]
    mapped = row[1]
    if total != mapped:
        raise RuntimeError(f"Cobertura incompleta: {mapped}/{total} CNAEs mapeados")

    return {
        "divisoes": len(parents),
        "subnichos": len(children),
        "cnaes": total,
    }


def main() -> None:
    with psycopg.connect(DATABASE_URL) as conn:
        # Garante tabelas (idempotente)
        schema = (ROOT / "db" / "schema.sql").read_text(encoding="utf-8")
        with conn.cursor() as cur:
            cur.execute(schema)
        conn.commit()

        stats = seed_nichos(conn)
        print(
            f"Nichos gerados: {stats['divisoes']} divisões, "
            f"{stats['subnichos']} subnichos, cobertura {stats['cnaes']}/{stats['cnaes']}"
        )


if __name__ == "__main__":
    main()
