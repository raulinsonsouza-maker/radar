from __future__ import annotations

import os
import re
from functools import lru_cache
from typing import Any, Optional

import psycopg
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from psycopg.rows import dict_row
from pydantic import BaseModel, EmailStr, Field
from pydantic_settings import BaseSettings

from pathlib import Path

from app.auth import (
    LoginRequest,
    TokenResponse,
    create_access_token,
    fetch_user_by_email,
    get_current_admin,
    mark_login,
    require_active_user,
    row_to_public,
    verify_password,
)
from app.kommo import create_radar_lead
from app.taxonomia import natureza_codigos, naturezas_para_meta
from app.users import UserCreate, UserUpdate, create_user, list_users, update_user

load_dotenv()


class Settings(BaseSettings):
    database_url: str = "postgresql://prospeccao:prospeccao@localhost:5433/prospeccao"
    cors_origins: str = "http://localhost:5173"
    secret_key: str = "dev-secret-change-me-in-production"
    kommo_token: str = ""
    kommo_subdomain: str = "symbius"
    kommo_pipeline_id: int = 11592391
    kommo_status_id: int = 109916160
    kommo_tag_id: int = 143385
    kommo_bot_id: int = 74791
    kommo_integration_id: str = ""

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_conn():
    return psycopg.connect(get_settings().database_url, row_factory=dict_row)


app = FastAPI(title="Prospecção CNPJ", version="0.2.0")

settings = get_settings()
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


PORTE_LABELS = {
    "00": "Não informado",
    "01": "Microempresa (ME)",
    "03": "Pequena empresa (EPP)",
    "05": "Médio e grande",
}

SITUACAO_LABELS = {
    "01": "Nula",
    "02": "Ativa",
    "03": "Suspensa",
    "04": "Inapta",
    "08": "Baixada",
}

# Qualificações típicas de quem decide (Receita Federal)
SOCIO_ADMIN_CODES = ("05", "10", "16", "49")  # Admin, Diretor, Presidente, Sócio-Administrador

FAIXA_ETARIA_LABELS = {
    "0": "Não se aplica",
    "1": "0 a 12 anos",
    "2": "13 a 20 anos",
    "3": "21 a 30 anos",
    "4": "31 a 40 anos",
    "5": "41 a 50 anos",
    "6": "51 a 60 anos",
    "7": "61 a 70 anos",
    "8": "71 a 80 anos",
    "9": "Mais de 80 anos",
}

IDENTIFICADOR_SOCIO = {
    "1": "Pessoa Física",
    "2": "Pessoa Jurídica",
    "3": "Estrangeiro",
}


class SearchResponse(BaseModel):
    total: int
    total_is_capped: bool = False
    page: int
    page_size: int
    items: list[dict[str, Any]]


class LeadCaptureRequest(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    whatsapp: str = Field(min_length=8, max_length=30)


class LeadCaptureResponse(BaseModel):
    ok: bool = True
    lead_id: Optional[int] = None
    message: str = "Recebemos seu contato. Em breve a Symbius fala com você."


def resolve_nicho_clause(nicho: str) -> tuple[str, list[Any]] | None:
    """Traduz slug de nicho em cláusula eficiente sobre cnae_fiscal_principal."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT tipo, valor FROM nicho_cnaes WHERE nicho_slug = %s",
            (nicho,),
        )
        rows = cur.fetchall()
    if not rows:
        return "FALSE", []

    prefixes = [r["valor"] for r in rows if r["tipo"] == "prefixo"]
    codes = [r["valor"] for r in rows if r["tipo"] == "codigo"]

    parts: list[str] = []
    params: list[Any] = []
    for prefix in prefixes:
        parts.append("cnae_fiscal_principal LIKE %s")
        params.append(f"{prefix}%")
    if codes:
        placeholders = ", ".join(["%s"] * len(codes))
        parts.append(f"cnae_fiscal_principal IN ({placeholders})")
        params.extend(codes)
    return "(" + " OR ".join(parts) + ")", params


def _as_list(value: Optional[str | list[str]]) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [v.strip() for v in value.replace(";", ",").split(",") if v.strip()]
    out: list[str] = []
    for item in value:
        out.extend(_as_list(item))
    return out


def lookup_cnpjs_by_text(cur, q: str, limit: int = 5000) -> list[str]:
    """Resolve texto → cnpj_basico via índice trigram (rápido)."""
    like = f"%{q.strip()}%"
    cur.execute(
        """
        SELECT cnpj_basico FROM (
            SELECT cnpj_basico FROM empresas WHERE razao_social ILIKE %s
            UNION
            SELECT cnpj_basico FROM estabelecimentos WHERE nome_fantasia ILIKE %s
        ) t
        LIMIT %s
        """,
        [like, like, limit],
    )
    return [r["cnpj_basico"] for r in cur.fetchall()]


def build_filters(
    q: Optional[str],
    situacao: Optional[str],
    uf: Optional[str | list[str]],
    municipio: Optional[str | list[str]],
    cnae: Optional[str],
    nicho: Optional[str],
    natureza: Optional[str],
    natureza_grupo: Optional[str],
    porte: Optional[str],
    opcao_simples: Optional[str],
    capital_min: Optional[float],
    capital_max: Optional[float],
    data_inicio_de: Optional[str],
    data_inicio_ate: Optional[str],
    idade_min: Optional[int],
    idade_max: Optional[int],
    tem_telefone: Optional[bool],
    tem_telefone_2: Optional[bool],
    tem_email: Optional[bool],
    tem_socio_admin: Optional[bool],
    matriz_apenas: Optional[bool],
    cnpj_basicos: Optional[list[str]] = None,
) -> tuple[str, list[Any]]:
    clauses: list[str] = []
    params: list[Any] = []

    # MEI fora da prospecção (permanente)
    clauses.append("(opcao_mei IS NULL OR opcao_mei <> 'S')")

    if cnpj_basicos is not None:
        if not cnpj_basicos:
            clauses.append("FALSE")
        else:
            clauses.append("cnpj_basico = ANY(%s)")
            params.append(cnpj_basicos)
    elif q:
        q_raw = q.strip()
        q_clean = q_raw.replace(".", "").replace("/", "").replace("-", "")
        # CNPJ (só dígitos): prefixo — usa índice e evita ILIKE lento
        if q_clean.isdigit() and len(q_clean) >= 4:
            clauses.append("cnpj LIKE %s")
            params.append(f"{q_clean}%")
        elif q_raw:
            # Texto sem pré-resolução (fallback); preferir cnpj_basicos
            like = f"%{q_raw}%"
            clauses.append("(razao_social ILIKE %s OR nome_fantasia ILIKE %s)")
            params.extend([like, like])

    if situacao:
        clauses.append("situacao_cadastral = %s")
        params.append(situacao)

    ufs = [u.upper() for u in _as_list(uf)]
    if len(ufs) == 1:
        clauses.append("uf = %s")
        params.append(ufs[0])
    elif len(ufs) > 1:
        placeholders = ", ".join(["%s"] * len(ufs))
        clauses.append(f"uf IN ({placeholders})")
        params.extend(ufs)

    municipios = _as_list(municipio)
    if municipios:
        codes = [m for m in municipios if len(m) == 4 and m.isdigit()]
        names = [m for m in municipios if m not in codes]
        parts: list[str] = []
        if codes:
            placeholders = ", ".join(["%s"] * len(codes))
            parts.append(f"municipio_codigo IN ({placeholders})")
            params.extend(codes)
        for name in names:
            parts.append("municipio_nome ILIKE %s")
            params.append(f"%{name}%")
        if parts:
            clauses.append("(" + " OR ".join(parts) + ")")

    if nicho:
        resolved = resolve_nicho_clause(nicho)
        if resolved:
            clause, nicho_params = resolved
            clauses.append(clause)
            params.extend(nicho_params)

    if cnae:
        clauses.append("(cnae_fiscal_principal = %s OR cnae_descricao ILIKE %s)")
        params.extend([cnae, f"%{cnae}%"])

    if natureza:
        clauses.append("(natureza_juridica = %s OR natureza_descricao ILIKE %s)")
        params.extend([natureza, f"%{natureza}%"])
    elif natureza_grupo in {"alta", "opcional", "permitidas"}:
        if natureza_grupo == "alta":
            codes = natureza_codigos("alta")
        elif natureza_grupo == "opcional":
            codes = natureza_codigos("opcional")
        else:
            codes = natureza_codigos("alta") + natureza_codigos("opcional")
        if codes:
            placeholders = ", ".join(["%s"] * len(codes))
            clauses.append(f"natureza_juridica IN ({placeholders})")
            params.extend(codes)

    if porte:
        clauses.append("porte = %s")
        params.append(porte)

    if opcao_simples in {"S", "N"}:
        clauses.append("opcao_simples = %s")
        params.append(opcao_simples)

    if capital_min is not None:
        clauses.append("capital_social >= %s")
        params.append(capital_min)

    if capital_max is not None:
        clauses.append("capital_social <= %s")
        params.append(capital_max)

    if data_inicio_de:
        clauses.append("data_inicio_atividade >= %s")
        params.append(data_inicio_de)

    if data_inicio_ate:
        clauses.append("data_inicio_atividade <= %s")
        params.append(data_inicio_ate)

    if idade_min is not None:
        clauses.append(
            "data_inicio_atividade IS NOT NULL AND "
            "EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_inicio_atividade)) >= %s"
        )
        params.append(idade_min)

    if idade_max is not None:
        clauses.append(
            "data_inicio_atividade IS NOT NULL AND "
            "EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_inicio_atividade)) <= %s"
        )
        params.append(idade_max)

    if tem_telefone is True:
        # Usa coluna bruta para aproveitar índice parcial de prospecção
        clauses.append("telefone_1 IS NOT NULL AND telefone_1 <> ''")
    if tem_telefone_2 is True:
        clauses.append("telefone_2_num IS NOT NULL AND telefone_2_num <> ''")
    if tem_email is True:
        clauses.append("correio_eletronico IS NOT NULL AND correio_eletronico <> ''")
    if tem_socio_admin is True:
        placeholders = ", ".join(["%s"] * len(SOCIO_ADMIN_CODES))
        clauses.append(
            "EXISTS ("
            "SELECT 1 FROM socios s "
            "WHERE s.cnpj_basico = v_prospectos.cnpj_basico "
            f"AND s.qualificacao_socio IN ({placeholders})"
            ")"
        )
        params.extend(SOCIO_ADMIN_CODES)
    if matriz_apenas is True:
        clauses.append("identificador_matriz_filial = '1'")

    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    return where, params


def _filter_kwargs(
    q, situacao, uf, municipio, cnae, nicho, natureza, natureza_grupo, porte,
    opcao_simples, capital_min, capital_max,
    data_inicio_de, data_inicio_ate, idade_min, idade_max,
    tem_telefone, tem_telefone_2, tem_email, tem_socio_admin, matriz_apenas,
    cnpj_basicos=None,
):
    return build_filters(
        q, situacao, uf, municipio, cnae, nicho, natureza, natureza_grupo, porte,
        opcao_simples, capital_min, capital_max,
        data_inicio_de, data_inicio_ate, idade_min, idade_max,
        tem_telefone, tem_telefone_2, tem_email, tem_socio_admin, matriz_apenas,
        cnpj_basicos=cnpj_basicos,
    )


def _prepare_text_q(q: Optional[str]) -> tuple[Optional[str], bool]:
    """Retorna (q_para_filtro, precisa_lookup_texto)."""
    if not q or not q.strip():
        return None, False
    q_raw = q.strip()
    q_clean = q_raw.replace(".", "").replace("/", "").replace("-", "")
    if q_clean.isdigit() and len(q_clean) >= 4:
        return q_raw, False
    return q_raw, True


def _empty_search(page: int, page_size: int) -> dict[str, Any]:
    return {
        "total": 0,
        "total_is_capped": False,
        "page": page,
        "page_size": page_size,
        "items": [],
    }


def _enrich_prospecto(item: dict[str, Any]) -> None:
    if item.get("data_inicio_atividade"):
        item["data_inicio_atividade"] = item["data_inicio_atividade"].isoformat()
    if item.get("capital_social") is not None:
        item["capital_social"] = float(item["capital_social"])
    if item.get("idade_anos") is not None:
        item["idade_anos"] = int(item["idade_anos"])
    if item.get("qtd_socios") is not None:
        item["qtd_socios"] = int(item["qtd_socios"])
    if item.get("qtd_filiais") is not None:
        item["qtd_filiais"] = int(item["qtd_filiais"])


@app.get("/api/health")
def health():
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS n FROM estabelecimentos")
            row = cur.fetchone()
        return {"ok": True, "estabelecimentos": row["n"] if row else 0}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/leads", response_model=LeadCaptureResponse)
async def capture_lead(payload: LeadCaptureRequest):
    cfg = get_settings()
    if not cfg.kommo_token.strip():
        raise HTTPException(status_code=503, detail="Captura de leads indisponível no momento")

    nome = payload.nome.strip()
    email = str(payload.email).strip().lower()
    whatsapp = payload.whatsapp.strip()
    if not re.search(r"\d{8,}", whatsapp):
        raise HTTPException(status_code=422, detail="Informe um WhatsApp válido")

    try:
        created = await create_radar_lead(
            token=cfg.kommo_token,
            subdomain=cfg.kommo_subdomain.strip() or "symbius",
            nome=nome,
            email=email,
            whatsapp=whatsapp,
            pipeline_id=cfg.kommo_pipeline_id,
            status_id=cfg.kommo_status_id,
            tag_id=cfg.kommo_tag_id,
            bot_id=cfg.kommo_bot_id,
        )
    except Exception as err:
        # Log detalhe interno; resposta ao cliente permanece genérica.
        import logging

        logging.getLogger("radar.kommo").exception("Falha ao criar lead no Kommo: %s", err)
        raise HTTPException(
            status_code=502,
            detail="Não foi possível registrar seu contato. Tente novamente em instantes.",
        ) from err

    lead_id = None
    if isinstance(created, dict):
        raw_id = created.get("id")
        if isinstance(raw_id, int):
            lead_id = raw_id
    return LeadCaptureResponse(lead_id=lead_id)


@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    user = fetch_user_by_email(str(payload.email))
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    if not user["ativo"]:
        raise HTTPException(status_code=403, detail="Usuário inativo")
    mark_login(user["id"])
    token = create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": row_to_public(user),
    }


@app.get("/api/auth/me")
def auth_me(user: dict[str, Any] = Depends(require_active_user)):
    return row_to_public(user)


@app.get("/api/admin/usuarios")
def admin_list_users(_: dict[str, Any] = Depends(get_current_admin)):
    return list_users()


@app.post("/api/admin/usuarios")
def admin_create_user(
    payload: UserCreate,
    _: dict[str, Any] = Depends(get_current_admin),
):
    return create_user(payload)


@app.patch("/api/admin/usuarios/{user_id}")
def admin_update_user(
    user_id: int,
    payload: UserUpdate,
    _: dict[str, Any] = Depends(get_current_admin),
):
    return update_user(user_id, payload)


@app.get("/api/municipios")
def search_municipios(
    q: str = Query(..., min_length=1),
    uf: Optional[list[str]] = Query(None),
    limit: int = Query(40, ge=1, le=80),
    _: dict[str, Any] = Depends(require_active_user),
):
    """Busca rápida de cidades por nome (e opcionalmente por UF)."""
    term = q.strip()
    if not term:
        return []

    ufs = [u.upper() for u in _as_list(uf)]
    clauses = ["m.nome ILIKE %s"]
    params: list[Any] = [f"%{term}%"]
    if ufs:
        placeholders = ", ".join(["%s"] * len(ufs))
        clauses.append(f"e.uf IN ({placeholders})")
        params.extend(ufs)

    where = " AND ".join(clauses)
    params.append(limit)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT m.codigo, m.nome, e.uf, COUNT(*) AS qtd
            FROM municipios m
            JOIN estabelecimentos e ON e.municipio = m.codigo
            WHERE {where}
            GROUP BY m.codigo, m.nome, e.uf
            ORDER BY qtd DESC, m.nome
            LIMIT %s
            """,
            params,
        )
        return cur.fetchall()


@app.get("/api/meta")
def meta(_: dict[str, Any] = Depends(require_active_user)):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT DISTINCT uf FROM estabelecimentos WHERE uf IS NOT NULL ORDER BY uf")
        ufs = [r["uf"] for r in cur.fetchall()]
        # Cidades sob demanda em /api/municipios (meta completa é lenta)
        municipios: list[dict[str, Any]] = []
        cur.execute(
            """
            SELECT c.codigo, c.descricao, COUNT(*) AS qtd
            FROM estabelecimentos e
            JOIN cnaes c ON c.codigo = e.cnae_fiscal_principal
            GROUP BY c.codigo, c.descricao
            ORDER BY qtd DESC
            LIMIT 300
            """
        )
        cnaes = cur.fetchall()
        cur.execute("SELECT codigo, descricao FROM motivos ORDER BY codigo")
        motivos = cur.fetchall()

        nichos_tree: list[dict[str, Any]] = []
        try:
            cur.execute(
                """
                SELECT slug, nome_amigavel, nome_oficial, parent_slug, ordem
                FROM nichos
                ORDER BY ordem, nome_amigavel
                """
            )
            rows = cur.fetchall()
            by_parent: dict[str | None, list] = {}
            for r in rows:
                by_parent.setdefault(r["parent_slug"], []).append(r)
            for parent in by_parent.get(None, []):
                filhos = [
                    {
                        "slug": f["slug"],
                        "nome": f["nome_amigavel"],
                        "nome_oficial": f["nome_oficial"],
                    }
                    for f in by_parent.get(parent["slug"], [])
                ]
                nichos_tree.append(
                    {
                        "slug": parent["slug"],
                        "nome": parent["nome_amigavel"],
                        "nome_oficial": parent["nome_oficial"],
                        "filhos": filhos,
                    }
                )
        except Exception:  # noqa: BLE001
            nichos_tree = []

    return {
        "ufs": ufs,
        "naturezas": naturezas_para_meta(),
        "nichos": nichos_tree,
        "municipios": municipios,
        "cnaes": cnaes,
        "motivos": motivos,
        "portes": [{"codigo": k, "descricao": v} for k, v in PORTE_LABELS.items()],
        "situacoes": [{"codigo": k, "descricao": v} for k, v in SITUACAO_LABELS.items()],
    }


@app.get("/api/prospectos", response_model=SearchResponse)
def search_prospectos(
    q: Optional[str] = None,
    situacao: Optional[str] = Query("02"),
    uf: Optional[list[str]] = Query(None),
    municipio: Optional[list[str]] = Query(None),
    cnae: Optional[str] = None,
    nicho: Optional[str] = None,
    natureza: Optional[str] = None,
    natureza_grupo: Optional[str] = None,
    porte: Optional[str] = None,
    opcao_simples: Optional[str] = None,
    capital_min: Optional[float] = None,
    capital_max: Optional[float] = None,
    data_inicio_de: Optional[str] = None,
    data_inicio_ate: Optional[str] = None,
    idade_min: Optional[int] = Query(None, ge=0, le=200),
    idade_max: Optional[int] = Query(None, ge=0, le=200),
    tem_telefone: Optional[bool] = None,
    tem_telefone_2: Optional[bool] = None,
    tem_email: Optional[bool] = None,
    tem_socio_admin: Optional[bool] = None,
    matriz_apenas: Optional[bool] = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    _: dict[str, Any] = Depends(require_active_user),
):
    q_filter, needs_text_lookup = _prepare_text_q(q)
    offset = (page - 1) * page_size
    admin_placeholders = ", ".join(["%s"] * len(SOCIO_ADMIN_CODES))

    with get_conn() as conn, conn.cursor() as cur:
        cnpj_basicos = None
        if needs_text_lookup and q_filter:
            cnpj_basicos = lookup_cnpjs_by_text(cur, q_filter)
            if not cnpj_basicos:
                return _empty_search(page, page_size)

        where, params = _filter_kwargs(
            q_filter if not needs_text_lookup else None,
            situacao, uf, municipio, cnae, nicho, natureza, natureza_grupo, porte,
            opcao_simples, capital_min, capital_max,
            data_inicio_de, data_inicio_ate, idade_min, idade_max,
            tem_telefone, tem_telefone_2, tem_email, tem_socio_admin, matriz_apenas,
            cnpj_basicos=cnpj_basicos,
        )

        cur.execute(
            f"SELECT COUNT(*)::bigint AS total FROM v_prospectos{where}",
            params,
        )
        total = int(cur.fetchone()["total"])
        total_is_capped = False

        cur.execute(
            f"""
            SELECT
                v.cnpj, v.cnpj_basico, v.razao_social, v.nome_fantasia, v.porte, v.porte_descricao,
                v.capital_social, v.natureza_juridica, v.natureza_descricao, v.situacao_cadastral,
                v.situacao_descricao, v.motivo_descricao, v.cnae_fiscal_principal, v.cnae_descricao,
                v.cnae_fiscal_secundaria, v.uf, v.municipio_nome, v.telefone, v.telefone_2, v.email,
                v.opcao_simples, v.data_inicio_atividade, v.tipo_estabelecimento, v.bairro,
                v.logradouro, v.numero, v.cep,
                CASE
                    WHEN v.data_inicio_atividade IS NULL THEN NULL
                    ELSE EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.data_inicio_atividade))::int
                END AS idade_anos,
                COALESCE(soc.qtd_socios, 0) AS qtd_socios,
                COALESCE(fil.qtd_filiais, 0) AS qtd_filiais,
                adm.socio_admin_nome
            FROM (
                SELECT
                    cnpj, cnpj_basico, razao_social, nome_fantasia, porte, porte_descricao,
                    capital_social, natureza_juridica, natureza_descricao, situacao_cadastral,
                    situacao_descricao, motivo_descricao, cnae_fiscal_principal, cnae_descricao,
                    cnae_fiscal_secundaria, uf, municipio_nome, telefone, telefone_2, email,
                    opcao_simples, data_inicio_atividade, tipo_estabelecimento, bairro,
                    logradouro, numero, cep
                FROM v_prospectos
                {where}
                ORDER BY cnpj
                LIMIT %s OFFSET %s
            ) v
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS qtd_socios
                FROM socios s
                WHERE s.cnpj_basico = v.cnpj_basico
            ) soc ON TRUE
            LEFT JOIN LATERAL (
                SELECT GREATEST(COUNT(*)::int - 1, 0) AS qtd_filiais
                FROM estabelecimentos e2
                WHERE e2.cnpj_basico = v.cnpj_basico
            ) fil ON TRUE
            LEFT JOIN LATERAL (
                SELECT s.nome_socio AS socio_admin_nome
                FROM socios s
                WHERE s.cnpj_basico = v.cnpj_basico
                  AND s.qualificacao_socio IN ({admin_placeholders})
                ORDER BY CASE s.qualificacao_socio
                    WHEN '49' THEN 0 WHEN '05' THEN 1 WHEN '16' THEN 2 ELSE 3
                END, s.nome_socio
                LIMIT 1
            ) adm ON TRUE
            """,
            [*params, page_size, offset, *SOCIO_ADMIN_CODES],
        )
        items = cur.fetchall()
        for item in items:
            _enrich_prospecto(item)

    return {
        "total": total,
        "total_is_capped": total_is_capped,
        "page": page,
        "page_size": page_size,
        "items": items,
    }


@app.get("/api/prospectos/{cnpj}/socios")
def list_socios(
    cnpj: str,
    _: dict[str, Any] = Depends(require_active_user),
):
    digits = "".join(ch for ch in cnpj if ch.isdigit())
    if len(digits) < 8:
        raise HTTPException(status_code=400, detail="CNPJ inválido")
    cnpj_basico = digits[:8]

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                s.nome_socio,
                s.cnpj_cpf_socio,
                s.identificador_socio,
                s.qualificacao_socio,
                q.descricao AS qualificacao_descricao,
                s.data_entrada_sociedade,
                s.pais,
                p.nome AS pais_nome,
                s.faixa_etaria,
                s.nome_representante,
                s.qualificacao_representante_legal,
                qr.descricao AS qualificacao_representante_descricao
            FROM socios s
            LEFT JOIN qualificacoes q ON q.codigo = s.qualificacao_socio
            LEFT JOIN qualificacoes qr ON qr.codigo = s.qualificacao_representante_legal
            LEFT JOIN paises p ON p.codigo = s.pais
            WHERE s.cnpj_basico = %s
            ORDER BY
                CASE WHEN s.qualificacao_socio IN ('05', '10', '16', '49') THEN 0 ELSE 1 END,
                s.data_entrada_sociedade NULLS LAST,
                s.nome_socio NULLS LAST
            LIMIT 100
            """,
            (cnpj_basico,),
        )
        rows = cur.fetchall()

    items: list[dict[str, Any]] = []
    for row in rows:
        ident = row.get("identificador_socio")
        data = row.get("data_entrada_sociedade")
        qual = row.get("qualificacao_socio")
        faixa = row.get("faixa_etaria")
        items.append(
            {
                "nome_socio": row.get("nome_socio"),
                "cnpj_cpf_socio": row.get("cnpj_cpf_socio"),
                "identificador_socio": ident,
                "tipo_socio": IDENTIFICADOR_SOCIO.get(ident) if ident else None,
                "qualificacao_socio": qual,
                "qualificacao_descricao": row.get("qualificacao_descricao"),
                "eh_admin": qual in SOCIO_ADMIN_CODES if qual else False,
                "data_entrada_sociedade": data.isoformat() if data else None,
                "pais": row.get("pais"),
                "pais_nome": row.get("pais_nome"),
                "faixa_etaria": faixa,
                "faixa_etaria_descricao": FAIXA_ETARIA_LABELS.get(faixa) if faixa else None,
                "nome_representante": row.get("nome_representante"),
                "qualificacao_representante_legal": row.get("qualificacao_representante_legal"),
                "qualificacao_representante_descricao": row.get(
                    "qualificacao_representante_descricao"
                ),
            }
        )
    return items


@app.get("/api/prospectos/export")
def export_prospectos(
    q: Optional[str] = None,
    situacao: Optional[str] = Query("02"),
    uf: Optional[list[str]] = Query(None),
    municipio: Optional[list[str]] = Query(None),
    cnae: Optional[str] = None,
    nicho: Optional[str] = None,
    natureza: Optional[str] = None,
    natureza_grupo: Optional[str] = None,
    porte: Optional[str] = None,
    opcao_simples: Optional[str] = None,
    capital_min: Optional[float] = None,
    capital_max: Optional[float] = None,
    data_inicio_de: Optional[str] = None,
    data_inicio_ate: Optional[str] = None,
    idade_min: Optional[int] = Query(None, ge=0, le=200),
    idade_max: Optional[int] = Query(None, ge=0, le=200),
    tem_telefone: Optional[bool] = None,
    tem_telefone_2: Optional[bool] = None,
    tem_email: Optional[bool] = None,
    tem_socio_admin: Optional[bool] = None,
    matriz_apenas: Optional[bool] = True,
    limit: int = Query(10000, ge=1, le=50000),
    user: dict[str, Any] = Depends(require_active_user),
):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Exportação indisponível")
    q_filter, needs_text_lookup = _prepare_text_q(q)
    admin_placeholders = ", ".join(["%s"] * len(SOCIO_ADMIN_CODES))

    headers = [
        "cnpj", "razao_social", "nome_fantasia", "porte_descricao", "capital_social",
        "natureza_descricao", "situacao_descricao", "cnae_fiscal_principal", "cnae_descricao",
        "uf", "municipio_nome", "telefone", "telefone_2", "email", "opcao_simples",
        "data_inicio_atividade", "idade_anos", "socio_admin_nome", "qtd_socios", "qtd_filiais",
    ]

    def generate():
        import csv
        from io import StringIO

        buf = StringIO()
        writer = csv.writer(buf, delimiter=";")
        writer.writerow(headers)
        yield buf.getvalue()
        buf.seek(0)
        buf.truncate(0)

        with get_conn() as conn, conn.cursor() as cur:
            cnpj_basicos = None
            if needs_text_lookup and q_filter:
                cnpj_basicos = lookup_cnpjs_by_text(cur, q_filter)
                if not cnpj_basicos:
                    return

            where, params = _filter_kwargs(
                q_filter if not needs_text_lookup else None,
                situacao, uf, municipio, cnae, nicho, natureza, natureza_grupo, porte,
                opcao_simples, capital_min, capital_max,
                data_inicio_de, data_inicio_ate, idade_min, idade_max,
                tem_telefone, tem_telefone_2, tem_email, tem_socio_admin, matriz_apenas,
                cnpj_basicos=cnpj_basicos,
            )
            cur.execute(
                f"""
                SELECT
                    v.cnpj, v.razao_social, v.nome_fantasia, v.porte_descricao, v.capital_social,
                    v.natureza_descricao, v.situacao_descricao, v.cnae_fiscal_principal, v.cnae_descricao,
                    v.uf, v.municipio_nome, v.telefone, v.telefone_2, v.email, v.opcao_simples,
                    v.data_inicio_atividade,
                    CASE
                        WHEN v.data_inicio_atividade IS NULL THEN NULL
                        ELSE EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.data_inicio_atividade))::int
                    END AS idade_anos,
                    adm.socio_admin_nome,
                    COALESCE(soc.qtd_socios, 0) AS qtd_socios,
                    COALESCE(fil.qtd_filiais, 0) AS qtd_filiais
                FROM (
                    SELECT
                        cnpj, cnpj_basico, razao_social, nome_fantasia, porte_descricao, capital_social,
                        natureza_descricao, situacao_descricao, cnae_fiscal_principal, cnae_descricao,
                        uf, municipio_nome, telefone, telefone_2, email, opcao_simples,
                        data_inicio_atividade
                    FROM v_prospectos
                    {where}
                    ORDER BY cnpj
                    LIMIT %s
                ) v
                LEFT JOIN LATERAL (
                    SELECT COUNT(*)::int AS qtd_socios
                    FROM socios s
                    WHERE s.cnpj_basico = v.cnpj_basico
                ) soc ON TRUE
                LEFT JOIN LATERAL (
                    SELECT GREATEST(COUNT(*)::int - 1, 0) AS qtd_filiais
                    FROM estabelecimentos e2
                    WHERE e2.cnpj_basico = v.cnpj_basico
                ) fil ON TRUE
                LEFT JOIN LATERAL (
                    SELECT s.nome_socio AS socio_admin_nome
                    FROM socios s
                    WHERE s.cnpj_basico = v.cnpj_basico
                      AND s.qualificacao_socio IN ({admin_placeholders})
                    ORDER BY CASE s.qualificacao_socio
                        WHEN '49' THEN 0 WHEN '05' THEN 1 WHEN '16' THEN 2 ELSE 3
                    END, s.nome_socio
                    LIMIT 1
                ) adm ON TRUE
                """,
                [*params, limit, *SOCIO_ADMIN_CODES],
            )
            for row in cur:
                writer.writerow([row.get(h) if row.get(h) is not None else "" for h in headers])
                yield buf.getvalue()
                buf.seek(0)
                buf.truncate(0)

    return StreamingResponse(
        generate(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=prospectos.csv"},
    )


# Produção: servir SPA do Vite (frontend/dist)
_FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if os.getenv("SERVE_FRONTEND", "").strip() in {"1", "true", "yes"} and _FRONTEND_DIST.is_dir():
    assets = _FRONTEND_DIST / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = _FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_FRONTEND_DIST / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", "8000")),
        reload=True,
    )
