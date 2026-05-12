"""Single-admin JWT auth: login, /me, get_current_admin dependency, admin seeding.

Bearer token in Authorization header. Token TTL 24h. Single user is seeded
from ADMIN_EMAIL / ADMIN_PASSWORD env vars on startup; rotating the .env
password updates the stored bcrypt hash.
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, insert, update

import database as T

log = logging.getLogger("cuestats.auth")

JWT_ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 24
LOCKOUT_AFTER = 5
LOCKOUT_MINUTES = 15


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def _jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET not configured")
    return secret


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(email: str) -> str:
    payload = {
        "sub": email,
        "role": "admin",
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])


async def seed_admin(engine) -> None:
    """Idempotent admin seed. Rotating ADMIN_PASSWORD updates the stored hash."""
    email = os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("ADMIN_PASSWORD")
    if not email or not password:
        log.warning("ADMIN_EMAIL/ADMIN_PASSWORD not set — admin login disabled")
        return
    email = email.strip().lower()
    now = datetime.now(timezone.utc).isoformat()

    async with engine.begin() as conn:
        row = (await conn.execute(
            select(T.admins).where(T.admins.c.email == email)
        )).fetchone()

        if row is None:
            await conn.execute(insert(T.admins).values(
                email=email,
                password_hash=hash_password(password),
                created_at=now,
            ))
            log.info(f"Seeded admin {email}")
        elif not verify_password(password, row.password_hash):
            await conn.execute(
                update(T.admins).where(T.admins.c.email == email)
                .values(password_hash=hash_password(password))
            )
            log.info(f"Updated admin password for {email}")


def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


async def _check_lockout(engine, identifier: str) -> None:
    async with engine.connect() as conn:
        row = (await conn.execute(
            select(T.login_attempts).where(T.login_attempts.c.identifier == identifier)
        )).fetchone()
    if not row:
        return
    if row.count >= LOCKOUT_AFTER:
        if row.last_at:
            last_dt = datetime.fromisoformat(row.last_at)
            unlocked_at = last_dt + timedelta(minutes=LOCKOUT_MINUTES)
            if datetime.now(timezone.utc) < unlocked_at:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many failed attempts. Try again in 15 minutes.",
                )
        async with engine.begin() as conn:
            await conn.execute(
                T.login_attempts.delete().where(T.login_attempts.c.identifier == identifier)
            )


async def _record_failed_attempt(engine, identifier: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    async with engine.begin() as conn:
        row = (await conn.execute(
            select(T.login_attempts).where(T.login_attempts.c.identifier == identifier)
        )).fetchone()
        if row:
            await conn.execute(
                update(T.login_attempts)
                .where(T.login_attempts.c.identifier == identifier)
                .values(count=row.count + 1, last_at=now)
            )
        else:
            await conn.execute(
                insert(T.login_attempts).values(identifier=identifier, count=1, last_at=now)
            )


async def _clear_attempts(engine, identifier: str) -> None:
    async with engine.begin() as conn:
        await conn.execute(
            T.login_attempts.delete().where(T.login_attempts.c.identifier == identifier)
        )


async def login(engine, request: Request, payload: LoginRequest) -> dict:
    email = payload.email.strip().lower()
    ip = (request.client.host if request.client else "anon")
    identifier = f"{ip}:{email}"

    await _check_lockout(engine, identifier)

    async with engine.connect() as conn:
        admin = (await conn.execute(
            select(T.admins).where(T.admins.c.email == email)
        )).fetchone()

    if not admin or not verify_password(payload.password, admin.password_hash):
        await _record_failed_attempt(engine, identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await _clear_attempts(engine, identifier)
    token = create_token(email)
    return {"token": token, "email": email, "role": "admin"}


def require_admin(request: Request) -> str:
    """FastAPI dependency: returns the admin's email or raises 401."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "admin" or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload["sub"]
