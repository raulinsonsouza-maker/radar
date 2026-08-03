"""Helpers compartilhados: naturezas B2B e limpeza de nomes CNAE."""

from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

_JARGON = re.compile(
    r"\s*,?\s*não especificad[oa]s? anteriormente\s*",
    re.IGNORECASE,
)
_MULTI_SPACE = re.compile(r"\s+")


def slugify(text: str) -> str:
    norm = unicodedata.normalize("NFKD", text)
    ascii_text = "".join(c for c in norm if not unicodedata.combining(c))
    ascii_text = ascii_text.lower()
    ascii_text = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    return ascii_text or "item"


def limpar_descricao_cnae(descricao: str) -> str:
    text = (descricao or "").strip()
    text = _JARGON.sub("", text)
    text = text.replace(" - ", " — ")
    text = _MULTI_SPACE.sub(" ", text).strip(" ,;—")
    if text.isupper() and len(text) > 3:
        text = text.title()
    # Capitaliza primeira letra se necessário
    if text and text[0].islower():
        text = text[0].upper() + text[1:]
    return text or descricao.strip()


@lru_cache
def load_naturezas_config() -> dict[str, Any]:
    path = DATA / "naturezas_prospeccao.json"
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache
def load_divisoes() -> dict[str, dict[str, str]]:
    path = DATA / "cnae_divisoes.json"
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache
def load_nicho_overrides() -> dict[str, str]:
    path = DATA / "nicho_nomes_amigaveis.json"
    return json.loads(path.read_text(encoding="utf-8"))


def natureza_codigos(grupo: str) -> list[str]:
    cfg = load_naturezas_config()
    if grupo == "excluir":
        return list(cfg["excluir"]["codigos"])
    return [i["codigo"] for i in cfg[grupo]["itens"]]


def natureza_excluidas() -> set[str]:
    return set(natureza_codigos("excluir"))


def natureza_permitidas(incluir_opcional: bool = True) -> set[str]:
    codes = set(natureza_codigos("alta"))
    if incluir_opcional:
        codes |= set(natureza_codigos("opcional"))
    return codes


def naturezas_para_meta() -> list[dict[str, str]]:
    cfg = load_naturezas_config()
    out: list[dict[str, str]] = []
    for grupo in ("alta", "opcional"):
        for item in cfg[grupo]["itens"]:
            out.append(
                {
                    "codigo": item["codigo"],
                    "descricao": item["nome_curto"],
                    "nome": item["nome"],
                    "grupo": grupo,
                }
            )
    return out
