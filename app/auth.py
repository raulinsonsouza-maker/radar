"""Autenticação JWT e dependências FastAPI."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any, Optional

import psycopg
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from psycopg.rows import dict_row
from pydantic import BaseModel, Field, field_validator
from pydantic_settings import BaseSettings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"
ACCESS_TOKEN_HOURS = 24


class AuthSettings(BaseSettings):
    database_url: str = "postgresql://prospeccao:prospeccao@localhost:5433/prospeccao"
    secret_key: str = "dev-secret-change-me-in-production"
    cors_origins: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_auth_settings() -> AuthSettings:
    return AuthSettings()


def get_conn():
    return psycopg.connect(get_auth_settings().database_url, row_factory=dict_row)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user: dict[str, Any]) -> str:
    settings = get_auth_settings()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_HOURS)
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "ativo": bool(user["ativo"]),
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        email = v.strip().lower()
        if "@" not in email or "." not in email.split("@")[-1]:
            raise ValueError("E-mail inválido")
        return email


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class UserPublic(BaseModel):
    id: int
    email: str
    nome: str
    role: str
    ativo: bool
    criado_em: Optional[str] = None
    ultimo_login: Optional[str] = None


def row_to_public(row: dict[str, Any]) -> dict[str, Any]:
    criado = row.get("criado_em")
    ultimo = row.get("ultimo_login")
    return {
        "id": row["id"],
        "email": row["email"],
        "nome": row["nome"],
        "role": row["role"],
        "ativo": bool(row["ativo"]),
        "criado_em": criado.isoformat() if criado else None,
        "ultimo_login": ultimo.isoformat() if ultimo else None,
    }


def fetch_user_by_email(email: str) -> Optional[dict[str, Any]]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, nome, password_hash, role, ativo, criado_em, ultimo_login
            FROM usuarios WHERE lower(email) = lower(%s)
            """,
            (email.strip(),),
        )
        return cur.fetchone()


def fetch_user_by_id(user_id: int) -> Optional[dict[str, Any]]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, nome, password_hash, role, ativo, criado_em, ultimo_login
            FROM usuarios WHERE id = %s
            """,
            (user_id,),
        )
        return cur.fetchone()


def mark_login(user_id: int) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE usuarios SET ultimo_login = NOW(), atualizado_em = NOW() WHERE id = %s",
            (user_id,),
        )
        conn.commit()


def decode_token(token: str) -> dict[str, Any]:
    settings = get_auth_settings()
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        ) from exc


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict[str, Any]:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado",
        )
    payload = decode_token(credentials.credentials)
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Token inválido") from exc

    user = fetch_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    if not user["ativo"]:
        raise HTTPException(status_code=403, detail="Usuário inativo")
    return user


def get_current_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return user


def require_active_user(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return user
