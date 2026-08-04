from __future__ import annotations

import logging
import re
from typing import Any

import httpx

logger = logging.getLogger("radar.kommo")

# Conta Symbius (symbius.kommo.com) — funil principal
DEFAULT_PIPELINE_ID = 11592391
DEFAULT_STATUS_ID = 109916160  # coluna "Radar"
DEFAULT_TAG_NAME = "Radar"
DEFAULT_TAG_COLOR = "FF8F92"  # vermelho na paleta Kommo
DEFAULT_TAG_ID = 143385
DEFAULT_BOT_ID = 74791  # Salesbot "Radar"


def normalize_whatsapp(raw: str) -> str:
    """Normaliza celular BR para o formato que a Kommo/WhatsApp aceita.

    A doc da Kommo (erro 3135) pede país + número válido e alerta que símbolos
    invalidam o envio. Gravamos só dígitos: 55 + DDD + 9 dígitos.
    Ex.: 5511999998888
    """
    digits = re.sub(r"\D+", "", raw or "")
    if not digits:
        return ""

    # Remove zeros à esquerda de discagem internacional (ex.: 0055…)
    digits = digits.lstrip("0") or digits

    if digits.startswith("55"):
        local = digits[2:]
    else:
        local = digits

    # Remove DDI duplicado residual
    if local.startswith("55") and len(local) > 11:
        local = local[2:]

    # Celular BR: DDD (2) + número. Se vier com 8 dígitos no número, inclui o 9.
    if len(local) == 10:
        # DDD + 8 dígitos (formato antigo) → insere 9 após o DDD
        local = local[:2] + "9" + local[2:]
    elif len(local) == 11 and local[2] != "9":
        # DDD + 9 dígitos, mas sem o nono dígito típico de celular
        local = local[:2] + "9" + local[2:]

    if len(local) < 10:
        # Número incompleto — devolve o que houver com DDI para não perder o lead
        return f"55{local}" if local else ""

    return f"55{local}"


async def launch_salesbot(
    *,
    client: httpx.AsyncClient,
    base: str,
    headers: dict[str, str],
    bot_id: int,
    lead_id: int,
) -> None:
    """Dispara o Salesbot no lead (POST /api/v4/bots/{id}/run)."""
    if not bot_id or not lead_id:
        return
    res = await client.post(
        f"{base}/bots/{bot_id}/run",
        headers=headers,
        json={"entity_id": lead_id, "entity_type": "leads"},
    )
    if res.status_code >= 400:
        logger.error("Falha ao lançar Salesbot %s no lead %s: %s %s", bot_id, lead_id, res.status_code, res.text)
        return
    logger.info("Salesbot %s lançado no lead %s (HTTP %s)", bot_id, lead_id, res.status_code)


async def create_radar_lead(
    *,
    token: str,
    subdomain: str,
    nome: str,
    email: str,
    whatsapp: str,
    pipeline_id: int = DEFAULT_PIPELINE_ID,
    status_id: int = DEFAULT_STATUS_ID,
    tag_id: int = DEFAULT_TAG_ID,
    tag_name: str = DEFAULT_TAG_NAME,
    tag_color: str = DEFAULT_TAG_COLOR,
    bot_id: int = DEFAULT_BOT_ID,
) -> dict[str, Any]:
    """Cria lead + contato no Kommo (coluna Radar, tag Radar) e dispara o Salesbot."""
    phone = normalize_whatsapp(whatsapp)
    if not phone or len(phone) < 12:
        raise ValueError(f"WhatsApp inválido após normalização: {whatsapp!r} → {phone!r}")

    base = f"https://{subdomain}.kommo.com/api/v4"
    payload = [
        {
            "name": f"Radar — {nome.strip()}",
            "pipeline_id": pipeline_id,
            "status_id": status_id,
            "_embedded": {
                "tags": [
                    {
                        "id": tag_id,
                        "name": tag_name,
                    }
                ],
                "contacts": [
                    {
                        "name": nome.strip(),
                        "custom_fields_values": [
                            {
                                "field_code": "EMAIL",
                                "values": [{"value": email.strip(), "enum_code": "WORK"}],
                            },
                            {
                                "field_code": "PHONE",
                                "values": [
                                    {
                                        # Celular BR sem símbolos: 55DDD9XXXXXXXX
                                        "value": phone,
                                        "enum_code": "MOB",
                                    }
                                ],
                            },
                        ],
                    }
                ],
            },
        }
    ]

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post(f"{base}/leads/complex", headers=headers, json=payload)
        if res.status_code >= 400:
            detail = res.text
            try:
                detail = res.json()
            except Exception:
                pass
            raise RuntimeError(f"Kommo HTTP {res.status_code}: {detail}")
        data = res.json()
        created: dict[str, Any]
        if isinstance(data, list) and data:
            created = data[0]
        elif isinstance(data, dict):
            created = data
        else:
            created = {"raw": data}

        lead_id = created.get("id") if isinstance(created, dict) else None
        if isinstance(lead_id, int) and bot_id:
            try:
                await launch_salesbot(
                    client=client,
                    base=base,
                    headers=headers,
                    bot_id=bot_id,
                    lead_id=lead_id,
                )
            except Exception:
                logger.exception("Erro ao lançar Salesbot no lead %s", lead_id)

        return created
