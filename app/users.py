"""CRUD de usuários (admin)."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException
from pydantic import BaseModel, Field, field_validator

from app.auth import get_conn, hash_password, row_to_public


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    nome: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=6, max_length=128)
    role: str = Field(default="cliente")
    ativo: bool = True

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        email = v.strip().lower()
        if "@" not in email or "." not in email.split("@")[-1]:
            raise ValueError("E-mail inválido")
        return email


class UserUpdate(BaseModel):
    nome: Optional[str] = Field(default=None, min_length=1, max_length=200)
    ativo: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)
    role: Optional[str] = None


def list_users() -> list[dict[str, Any]]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, nome, role, ativo, criado_em, ultimo_login
            FROM usuarios
            ORDER BY criado_em DESC, id DESC
            """
        )
        return [row_to_public(r) for r in cur.fetchall()]


def create_user(payload: UserCreate) -> dict[str, Any]:
    role = payload.role if payload.role in {"admin", "cliente"} else "cliente"
    email = payload.email
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM usuarios WHERE lower(email) = %s", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="E-mail já cadastrado")
        cur.execute(
            """
            INSERT INTO usuarios (email, nome, password_hash, role, ativo)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, email, nome, role, ativo, criado_em, ultimo_login
            """,
            (email, payload.nome.strip(), hash_password(payload.password), role, payload.ativo),
        )
        row = cur.fetchone()
        conn.commit()
    return row_to_public(row)


def update_user(user_id: int, payload: UserUpdate) -> dict[str, Any]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, email, nome, role, ativo, criado_em, ultimo_login FROM usuarios WHERE id = %s",
            (user_id,),
        )
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        nome = payload.nome.strip() if payload.nome is not None else existing["nome"]
        ativo = existing["ativo"] if payload.ativo is None else payload.ativo
        role = existing["role"]
        if payload.role is not None:
            if payload.role not in {"admin", "cliente"}:
                raise HTTPException(status_code=400, detail="Role inválida")
            role = payload.role

        if payload.password:
            cur.execute(
                """
                UPDATE usuarios
                SET nome = %s, ativo = %s, role = %s, password_hash = %s, atualizado_em = NOW()
                WHERE id = %s
                RETURNING id, email, nome, role, ativo, criado_em, ultimo_login
                """,
                (nome, ativo, role, hash_password(payload.password), user_id),
            )
        else:
            cur.execute(
                """
                UPDATE usuarios
                SET nome = %s, ativo = %s, role = %s, atualizado_em = NOW()
                WHERE id = %s
                RETURNING id, email, nome, role, ativo, criado_em, ultimo_login
                """,
                (nome, ativo, role, user_id),
            )
        row = cur.fetchone()
        conn.commit()
    return row_to_public(row)
