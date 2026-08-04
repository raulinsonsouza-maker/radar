from __future__ import annotations

import re
from typing import Any

import httpx

# Conta Symbius (symbius.kommo.com) — funil principal
DEFAULT_PIPELINE_ID = 11592391
DEFAULT_STATUS_ID = 89030651  # coluna "Leads"
DEFAULT_TAG_NAME = "Radar"
DEFAULT_TAG_COLOR = "FF8F92"  # vermelho na paleta Kommo
DEFAULT_TAG_ID = 143385


def normalize_whatsapp(raw: str) -> str:
    digits = re.sub(r"\D+", "", raw or "")
    if not digits:
        return ""
    if digits.startswith("55") and len(digits) >= 12:
        return f"+{digits}"
    if len(digits) >= 10:
        return f"+55{digits}"
    return f"+{digits}"


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
) -> dict[str, Any]:
    """Cria lead + contato no Kommo (coluna Leads, tag Radar)."""
    phone = normalize_whatsapp(whatsapp)
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
                                "values": [{"value": phone, "enum_code": "MOB"}],
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
        if isinstance(data, list) and data:
            return data[0]
        return data if isinstance(data, dict) else {"raw": data}
