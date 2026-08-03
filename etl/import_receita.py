"""
Importação dos dados abertos CNPJ (Receita Federal) para PostgreSQL.

Uso:
  python -m etl.import_receita --sample 50000
  python -m etl.import_receita --full
"""

from __future__ import annotations

import argparse
import csv
import io
import os
import sys
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Iterable, Iterator, Optional

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from app.taxonomia import natureza_excluidas  # noqa: E402
from scripts.seed_nichos import seed_nichos  # noqa: E402

BASE_DIR = Path(os.getenv("BASE_DIR", str(ROOT / "base")))
if not BASE_DIR.is_absolute():
    BASE_DIR = ROOT / BASE_DIR

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://prospeccao:prospeccao@localhost:5433/prospeccao",
)
ENCODING = "latin-1"
BATCH = 5_000

DOMAIN_FILES = {
    "cnaes": ("F.K03200$Z.D60711.CNAECSV", "Cnaes.zip"),
    "municipios": ("F.K03200$Z.D60711.MUNICCSV", "Municipios.zip"),
    "naturezas_juridicas": ("F.K03200$Z.D60711.NATJUCSV", "Naturezas.zip"),
    "paises": ("F.K03200$Z.D60711.PAISCSV", "Paises.zip"),
    "qualificacoes": ("F.K03200$Z.D60711.QUALSCSV", "Qualificacoes.zip"),
    "motivos": (None, "Motivos.zip"),
}

EMPRESA_COLS = [
    "cnpj_basico", "razao_social", "natureza_juridica", "qualificacao_responsavel",
    "capital_social", "porte", "ente_federativo",
]
SIMPLES_COLS = [
    "cnpj_basico", "opcao_simples", "data_opcao_simples", "data_exclusao_simples",
    "opcao_mei", "data_opcao_mei", "data_exclusao_mei",
]
ESTAB_COLS = [
    "cnpj_basico", "cnpj_ordem", "cnpj_dv", "identificador_matriz_filial", "nome_fantasia",
    "situacao_cadastral", "data_situacao_cadastral", "motivo_situacao_cadastral",
    "nome_cidade_exterior", "pais", "data_inicio_atividade", "cnae_fiscal_principal",
    "cnae_fiscal_secundaria", "tipo_logradouro", "logradouro", "numero", "complemento",
    "bairro", "cep", "uf", "municipio", "ddd_1", "telefone_1", "ddd_2", "telefone_2",
    "ddd_fax", "fax", "correio_eletronico", "situacao_especial", "data_situacao_especial",
]
SOCIO_COLS = [
    "cnpj_basico", "identificador_socio", "nome_socio", "cnpj_cpf_socio",
    "qualificacao_socio", "data_entrada_sociedade", "pais", "representante_legal",
    "nome_representante", "qualificacao_representante_legal", "faixa_etaria",
]


def log(msg: str) -> None:
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def parse_date(value: str) -> Optional[str]:
    value = (value or "").strip()
    if not value or value == "00000000" or len(value) != 8:
        return None
    try:
        datetime.strptime(value, "%Y%m%d")
        return f"{value[0:4]}-{value[4:6]}-{value[6:8]}"
    except ValueError:
        return None


def parse_capital(value: str) -> Optional[str]:
    value = (value or "").strip()
    if not value:
        return None
    normalized = value.replace(".", "").replace(",", ".")
    try:
        float(normalized)
        return normalized
    except ValueError:
        return None


def normalize_telefone_br(num: Optional[str]) -> Optional[str]:
    """Número local (sem DDD): celular antigo de 8 dígitos ganha o 9º dígito."""
    if not num:
        return None
    digits = "".join(c for c in num if c.isdigit())
    if not digits:
        return None
    if len(digits) == 8 and digits[0] in "6789":
        return "9" + digits
    return digits


def open_csv_path(path: Path) -> Iterator[list[str]]:
    with path.open("r", encoding=ENCODING, newline="") as f:
        reader = csv.reader(f, delimiter=";", quotechar='"')
        for row in reader:
            yield row


def open_csv_from_zip(zip_path: Path) -> Iterator[list[str]]:
    with zipfile.ZipFile(zip_path, "r") as zf:
        member = zf.namelist()[0]
        with zf.open(member) as raw:
            text = io.TextIOWrapper(raw, encoding=ENCODING, newline="")
            reader = csv.reader(text, delimiter=";", quotechar='"')
            for row in reader:
                yield row


def resolve_domain_source(table: str) -> Iterator[list[str]]:
    csv_name, zip_name = DOMAIN_FILES[table]
    if csv_name:
        csv_path = BASE_DIR / csv_name
        if csv_path.exists():
            return open_csv_path(csv_path)
    zip_path = BASE_DIR / zip_name
    if zip_path.exists():
        return open_csv_from_zip(zip_path)
    raise FileNotFoundError(
        f"Arquivo de domínio não encontrado para {table}: {csv_name} / {zip_name}"
    )


def iter_source_rows(paths: list[Path]) -> Iterator[list[str]]:
    for path in paths:
        log(f"  lendo {path.name}")
        if path.suffix.lower() == ".zip":
            yield from open_csv_from_zip(path)
        else:
            yield from open_csv_path(path)


def copy_rows(
    conn: psycopg.Connection,
    table: str,
    columns: list[str],
    rows: Iterable[tuple],
) -> int:
    count = 0
    buf: list[tuple] = []
    cols = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))
    sql = f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"

    with conn.cursor() as cur:
        for row in rows:
            buf.append(row)
            if len(buf) >= BATCH:
                cur.executemany(sql, buf)
                count += len(buf)
                buf.clear()
                if count % 50_000 == 0:
                    conn.commit()
                    log(f"    {table}: {count:,} linhas...")
        if buf:
            cur.executemany(sql, buf)
            count += len(buf)
    conn.commit()
    return count


_NATUREZAS_EXCLUIDAS = natureza_excluidas()


def natureza_b2b_ok(codigo: Optional[str]) -> bool:
    """Rejeita governo, política, internacionais e naturezas especiais."""
    if not codigo:
        return False
    return codigo.strip() not in _NATUREZAS_EXCLUIDAS


def map_empresa(row: list[str]) -> Optional[tuple]:
    if len(row) < 7:
        return None
    natureza = row[2].strip() or None
    if not natureza_b2b_ok(natureza):
        return None
    return (
        row[0].strip(),
        row[1].strip() or None,
        natureza,
        row[3].strip() or None,
        parse_capital(row[4]),
        row[5].strip() or None,
        row[6].strip() or None,
    )


def map_simples(row: list[str]) -> Optional[tuple]:
    if len(row) < 7:
        return None
    return (
        row[0].strip(),
        row[1].strip() or None,
        parse_date(row[2]),
        parse_date(row[3]),
        row[4].strip() or None,
        parse_date(row[5]),
        parse_date(row[6]),
    )


def map_estabelecimento(row: list[str]) -> Optional[tuple]:
    if len(row) < 30:
        return None
    return (
        row[0].strip(),
        row[1].strip(),
        row[2].strip(),
        row[3].strip() or None,
        row[4].strip() or None,
        row[5].strip() or None,
        parse_date(row[6]),
        row[7].strip() or None,
        row[8].strip() or None,
        row[9].strip() or None,
        parse_date(row[10]),
        row[11].strip() or None,
        row[12].strip() or None,
        row[13].strip() or None,
        row[14].strip() or None,
        row[15].strip() or None,
        row[16].strip() or None,
        row[17].strip() or None,
        row[18].strip() or None,
        row[19].strip() or None,
        row[20].strip() or None,
        row[21].strip() or None,
        normalize_telefone_br(row[22]),
        row[23].strip() or None,
        normalize_telefone_br(row[24]),
        row[25].strip() or None,
        row[26].strip() or None,
        row[27].strip() or None,
        row[28].strip() or None,
        parse_date(row[29]),
    )


def map_socio(row: list[str]) -> Optional[tuple]:
    if len(row) < 11:
        return None
    return (
        row[0].strip(),
        row[1].strip() or None,
        row[2].strip() or None,
        row[3].strip() or None,
        row[4].strip() or None,
        parse_date(row[5]),
        row[6].strip() or None,
        row[7].strip() or None,
        row[8].strip() or None,
        row[9].strip() or None,
        row[10].strip() or None,
    )


def purge_mei(conn: psycopg.Connection) -> dict[str, int]:
    """Remove CNPJs com opcao_mei='S' de todas as tabelas factuais."""
    stats: dict[str, int] = {}
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM simples WHERE opcao_mei = 'S'")
        mei_count = cur.fetchone()[0]
        if mei_count == 0:
            log("  MEI: nenhum registro para remover")
            return {"mei_cnpjs": 0, "estabelecimentos": 0, "socios": 0, "simples": 0, "empresas": 0}

        cur.execute(
            """
            DELETE FROM estabelecimentos e
            USING simples s
            WHERE e.cnpj_basico = s.cnpj_basico AND s.opcao_mei = 'S'
            """
        )
        stats["estabelecimentos"] = cur.rowcount

        cur.execute(
            """
            DELETE FROM socios so
            USING simples s
            WHERE so.cnpj_basico = s.cnpj_basico AND s.opcao_mei = 'S'
            """
        )
        stats["socios"] = cur.rowcount

        cur.execute(
            """
            DELETE FROM empresas emp
            USING simples s
            WHERE emp.cnpj_basico = s.cnpj_basico AND s.opcao_mei = 'S'
            """
        )
        stats["empresas"] = cur.rowcount

        cur.execute("DELETE FROM simples WHERE opcao_mei = 'S'")
        stats["simples"] = cur.rowcount
        stats["mei_cnpjs"] = mei_count

    conn.commit()
    log(
        f"  MEI removidos: {stats['mei_cnpjs']:,} CNPJs · "
        f"estab={stats['estabelecimentos']:,} · socios={stats['socios']:,} · "
        f"empresas={stats['empresas']:,} · simples={stats['simples']:,}"
    )
    return stats


def apply_schema(conn: psycopg.Connection) -> None:
    schema = (ROOT / "db" / "schema.sql").read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(schema)
    conn.commit()
    log("Schema aplicado.")


def truncate_facts(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute("TRUNCATE socios, estabelecimentos, simples, empresas CASCADE")
    conn.commit()


def load_domains(conn: psycopg.Connection) -> None:
    log("Carregando tabelas de domínio...")
    for table in DOMAIN_FILES:
        col2 = "nome" if table in {"municipios", "paises"} else "descricao"
        mapped = [
            (r[0].strip(), r[1].strip())
            for r in resolve_domain_source(table)
            if len(r) >= 2 and r[0].strip()
        ]
        with conn.cursor() as cur:
            cur.execute(f"TRUNCATE {table} CASCADE")
        conn.commit()
        n = copy_rows(conn, table, ["codigo", col2], mapped)
        log(f"  {table}: {n:,}")

    log("Gerando árvore de nichos CNAE...")
    stats = seed_nichos(conn)
    log(
        f"  nichos: {stats['divisoes']} divisões · "
        f"{stats['subnichos']} subnichos · cobertura {stats['cnaes']}"
    )


def empresa_sources(*, full: bool = False) -> list[Path]:
    zips = sorted(BASE_DIR.glob("Empresas*.zip"))
    csvs = sorted(BASE_DIR.glob("*EMPRECSV*"))
    # No --full, preferir zips (shards oficiais) para nao duplicar com CSV extraido
    if full:
        paths = zips or csvs
    else:
        paths = zips + csvs
    if not paths:
        raise FileNotFoundError("Nenhum arquivo de Empresas encontrado em base/")
    return paths


def simples_sources(*, full: bool = False) -> list[Path]:
    zips = sorted(BASE_DIR.glob("Simples*.zip"))
    csvs = sorted(
        p for p in BASE_DIR.glob("*SIMPLES*")
        if p.is_file() and p.suffix.lower() != ".zip"
    )
    if full:
        return zips or csvs
    return zips + csvs


def copy_bulk(
    conn: psycopg.Connection,
    table: str,
    columns: list[str],
    rows: Iterable[tuple],
    dedupe_cols: list[str] | None = None,
) -> int:
    """Carga rapida via COPY. Com dedupe, filtra em memoria as chaves ja vistas."""
    count = 0
    inserted = 0
    cols = ", ".join(columns)
    seen: set[tuple] | None = set() if dedupe_cols else None
    key_idxs = [columns.index(c) for c in dedupe_cols] if dedupe_cols else []

    with conn.cursor() as cur:
        with cur.copy(f"COPY {table} ({cols}) FROM STDIN") as copy:
            for row in rows:
                count += 1
                if seen is not None:
                    key = tuple(row[i] for i in key_idxs)
                    if key in seen:
                        continue
                    seen.add(key)
                copy.write_row(row)
                inserted += 1
                if count % 500_000 == 0:
                    log(f"    {table}: lidas={count:,} inseridas={inserted:,}")
    conn.commit()
    if dedupe_cols:
        log(f"    {table}: {count:,} lidas -> {inserted:,} inseridas")
    return inserted


def load_paths_copy(
    conn: psycopg.Connection,
    table: str,
    columns: list[str],
    mapper,
    paths: list[Path],
    dedupe_cols: list[str] | None = None,
    accept=None,
    on_inserted=None,
) -> int:
    """Carrega varios arquivos um a um (commit por arquivo)."""
    total = 0
    seen: set[tuple] = set()
    key_idxs = [columns.index(c) for c in dedupe_cols] if dedupe_cols else []
    cols = ", ".join(columns)

    for path in paths:
        log(f"  lendo {path.name}")
        file_read = 0
        file_ins = 0
        with conn.cursor() as cur:
            with cur.copy(f"COPY {table} ({cols}) FROM STDIN") as copy:
                source = (
                    open_csv_from_zip(path)
                    if path.suffix.lower() == ".zip"
                    else open_csv_path(path)
                )
                for row in source:
                    mapped = mapper(row)
                    if not mapped:
                        continue
                    file_read += 1
                    if accept is not None and not accept(mapped):
                        continue
                    if dedupe_cols:
                        key = tuple(mapped[i] for i in key_idxs)
                        if key in seen:
                            continue
                        seen.add(key)
                    copy.write_row(mapped)
                    file_ins += 1
                    if on_inserted is not None:
                        on_inserted(mapped)
                    if file_read % 500_000 == 0:
                        log(
                            f"    {path.name}: lidas={file_read:,} "
                            f"inseridas={file_ins:,} (total {total + file_ins:,})"
                        )
        conn.commit()
        total += file_ins
        log(f"  {path.name}: +{file_ins:,} (acumulado {total:,})")
    return total


def drop_fact_indexes(conn: psycopg.Connection) -> None:
    log("Removendo indices factuais para acelerar a carga...")
    stmts = [
        "DROP INDEX IF EXISTS ix_empresas_porte",
        "DROP INDEX IF EXISTS ix_empresas_natureza",
        "DROP INDEX IF EXISTS ix_empresas_capital",
        "DROP INDEX IF EXISTS ix_empresas_razao",
        "DROP INDEX IF EXISTS ix_estab_cnpj_basico",
        "DROP INDEX IF EXISTS ix_estab_situacao",
        "DROP INDEX IF EXISTS ix_estab_uf",
        "DROP INDEX IF EXISTS ix_estab_municipio",
        "DROP INDEX IF EXISTS ix_estab_cnae",
        "DROP INDEX IF EXISTS ix_estab_matriz",
        "DROP INDEX IF EXISTS ix_estab_inicio",
        "DROP INDEX IF EXISTS ix_estab_contato_ativo",
        "DROP INDEX IF EXISTS ix_simples_opcoes",
        "DROP INDEX IF EXISTS ix_socios_cnpj",
        "DROP INDEX IF EXISTS ix_estab_prospect_tel_cnpj",
        "DROP INDEX IF EXISTS ix_estab_prospect_tel_uf_cnpj",
        "DROP INDEX IF EXISTS ix_estab_prospect_tel_cnae_cnpj",
        "DROP INDEX IF EXISTS ix_empresas_natureza_cnpj",
        "DROP INDEX IF EXISTS ix_simples_mei_cnpj",
    ]
    with conn.cursor() as cur:
        for s in stmts:
            cur.execute(s)
    conn.commit()


def recreate_fact_indexes(conn: psycopg.Connection) -> None:
    log("Recriando indices...")
    schema = (ROOT / "db" / "schema.sql").read_text(encoding="utf-8")
    # Reaplica so os CREATE INDEX do schema (IF NOT EXISTS)
    with conn.cursor() as cur:
        for line in schema.splitlines():
            if line.strip().upper().startswith("CREATE INDEX"):
                cur.execute(line)
    conn.commit()


def load_by_cnpj_set(
    conn: psycopg.Connection,
    table: str,
    columns: list[str],
    mapper,
    paths: list[Path],
    cnpjs: set[str],
    max_scan: int | None = None,
) -> int:
    if not paths:
        log(f"  {table}: arquivo nao encontrado — pulando")
        return 0
    log(f"Importando {table} filtrado por amostra ({len(paths)} arquivo(s))...")
    buf: list[tuple] = []
    matched = 0
    scanned = 0
    remaining = set(cnpjs)
    one_per_cnpj = table in {"empresas", "simples"}

    with conn.cursor() as cur:
        cols = ", ".join(columns)
        placeholders = ", ".join(["%s"] * len(columns))
        sql = f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
        for path in paths:
            if one_per_cnpj and not remaining:
                break
            log(f"  lendo {path.name} (restam {len(remaining):,} cnpjs)")
            source = (
                open_csv_from_zip(path)
                if path.suffix.lower() == ".zip"
                else open_csv_path(path)
            )
            for row in source:
                scanned += 1
                mapped = mapper(row)
                if not mapped:
                    continue
                key = mapped[0]
                if key in remaining:
                    buf.append(mapped)
                    matched += 1
                    if one_per_cnpj:
                        remaining.discard(key)
                if len(buf) >= BATCH:
                    cur.executemany(sql, buf)
                    buf.clear()
                    conn.commit()
                if scanned % 500_000 == 0:
                    log(f"    {table}: matched={matched:,} scanned={scanned:,} restam={len(remaining):,}")
                if one_per_cnpj and not remaining:
                    break
                if max_scan is not None and scanned >= max_scan:
                    break
            if max_scan is not None and scanned >= max_scan:
                break
        if buf:
            cur.executemany(sql, buf)
    conn.commit()
    log(f"  {table}: {matched:,} (scanned {scanned:,})")
    return matched


def load_sample(conn: psycopg.Connection, sample_size: int) -> None:
    """
    Estrategia de amostra com joins garantidos:
    1) N estabelecimentos do 1o shard
    2) empresas / simples / socios dos cnpj_basico dessa amostra
    """
    truncate_facts(conn)
    load_domains(conn)

    estab_zips = sorted(BASE_DIR.glob("Estabelecimentos*.zip"))
    if not estab_zips:
        raise FileNotFoundError("Nenhum Estabelecimentos*.zip encontrado em base/")

    shard = estab_zips[0]
    log(f"Importando {sample_size:,} estabelecimentos de {shard.name}...")
    cnpjs: set[str] = set()
    estab_rows: list[tuple] = []
    for row in open_csv_from_zip(shard):
        mapped = map_estabelecimento(row)
        if not mapped:
            continue
        estab_rows.append(mapped)
        cnpjs.add(mapped[0])
        if len(estab_rows) >= sample_size:
            break
    n = copy_rows(conn, "estabelecimentos", ESTAB_COLS, estab_rows)
    log(f"  estabelecimentos: {n:,} | cnpjs unicos: {len(cnpjs):,}")

    load_by_cnpj_set(
        conn, "empresas", EMPRESA_COLS, map_empresa,
        empresa_sources(), cnpjs,
    )
    simples = simples_sources()
    # Preferir Simples.zip; nao exigir 100% dos CNPJs (nem todos optam pelo Simples)
    simples_paths = [p for p in simples if p.suffix.lower() == ".zip"] or simples[:1]
    load_by_cnpj_set(
        conn, "simples", SIMPLES_COLS, map_simples,
        simples_paths, cnpjs, max_scan=max(sample_size * 400, 2_000_000),
    )

    socios_zips = sorted(BASE_DIR.glob("Socios*.zip"))
    if socios_zips:
        # Um shard basta para amostra; varios socios por CNPJ
        load_by_cnpj_set(
            conn, "socios", SOCIO_COLS, map_socio,
            [socios_zips[0]], cnpjs, max_scan=max(sample_size * 80, 800_000),
        )

    log("Removendo MEI da amostra...")
    purge_mei(conn)

    with conn.cursor() as cur:
        cur.execute("ANALYZE")
    conn.commit()
    log("Amostra concluida.")


def load_full(conn: psycopg.Connection) -> None:
    """
    Carga filtrada para prospeccao:
    - so estabelecimentos ATIVOS (situacao 02)
    - so empresas com capital_social > 0 e com estabelecimento ativo
    - sem MEI (opcao_mei = S)
    - simples/socios apenas desses CNPJs
    """
    truncate_facts(conn)
    load_domains(conn)
    drop_fact_indexes(conn)

    active_cnpjs: set[str] = set()

    paths = sorted(BASE_DIR.glob("Estabelecimentos*.zip"))
    if not paths:
        paths = list(BASE_DIR.glob("*ESTABELE*"))
    log(f"Importando estabelecimentos ATIVOS ({len(paths)} arquivo(s))...")
    n = load_paths_copy(
        conn,
        "estabelecimentos",
        ESTAB_COLS,
        map_estabelecimento,
        paths,
        dedupe_cols=["cnpj_basico", "cnpj_ordem", "cnpj_dv"],
        accept=lambda r: (r[5] or "") == "02",  # situacao_cadastral
        on_inserted=lambda r: active_cnpjs.add(r[0]),
    )
    log(f"  estabelecimentos ativos: {n:,} | cnpjs: {len(active_cnpjs):,}")

    def empresa_ok(row: tuple) -> bool:
        if row[0] not in active_cnpjs:
            return False
        # natureza já filtrada em map_empresa (retorna None se excluída)
        cap = row[4]
        if cap is None:
            return False
        try:
            return float(cap) > 0
        except (TypeError, ValueError):
            return False

    paths = empresa_sources(full=True)
    log(
        f"Importando empresas B2B (natureza permitida, capital>0, "
        f"com estabelecimento ativo) ({len(paths)} arquivo(s))..."
    )
    n = load_paths_copy(
        conn,
        "empresas",
        EMPRESA_COLS,
        map_empresa,
        paths,
        dedupe_cols=["cnpj_basico"],
        accept=empresa_ok,
    )
    log(f"  empresas: {n:,}")

    # restringe proximas cargas aos CNPJs que de fato entraram em empresas
    with conn.cursor() as cur:
        cur.execute("SELECT cnpj_basico FROM empresas")
        keep = {r[0] for r in cur.fetchall()}
    log(f"  cnpjs finais para simples/socios: {len(keep):,}")

    paths = simples_sources(full=True)
    if paths:
        log(f"Importando simples filtrado ({len(paths)} arquivo(s))...")
        n = load_paths_copy(
            conn,
            "simples",
            SIMPLES_COLS,
            map_simples,
            paths,
            dedupe_cols=["cnpj_basico"],
            accept=lambda r: r[0] in keep,
        )
        log(f"  simples: {n:,}")

    paths = sorted(BASE_DIR.glob("Socios*.zip"))
    if paths:
        log(f"Importando socios filtrado ({len(paths)} arquivo(s))...")
        n = load_paths_copy(
            conn,
            "socios",
            SOCIO_COLS,
            map_socio,
            paths,
            accept=lambda r: r[0] in keep,
        )
        log(f"  socios: {n:,}")

    log("Removendo MEI da carga...")
    purge_mei(conn)

    recreate_fact_indexes(conn)
    with conn.cursor() as cur:
        cur.execute("ANALYZE")
    conn.commit()
    log("Carga completa concluida.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa dados CNPJ da Receita para PostgreSQL")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--sample", type=int, nargs="?", const=50_000, help="Amostragem (default 50000)")
    mode.add_argument("--full", action="store_true", help="Carga completa")
    parser.add_argument("--skip-schema", action="store_true", help="Não reaplica schema.sql")
    args = parser.parse_args()

    if not BASE_DIR.exists():
        log(f"Pasta base não encontrada: {BASE_DIR}")
        sys.exit(1)

    log(f"Conectando em ...@{DATABASE_URL.split('@')[-1]}")
    with psycopg.connect(DATABASE_URL) as conn:
        if not args.skip_schema:
            apply_schema(conn)
        if args.full:
            load_full(conn)
        else:
            load_sample(conn, args.sample or 50_000)


if __name__ == "__main__":
    main()
