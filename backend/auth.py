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


async def seed_admin(db) -> None:
    """Idempotent admin seed. Rotating ADMIN_PASSWORD updates the stored hash."""
    email = os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("ADMIN_PASSWORD")
    if not email or not password:
        log.warning("ADMIN_EMAIL/ADMIN_PASSWORD not set — admin login disabled")
        return
    email = email.strip().lower()
    existing = await db.admins.find_one({"email": email})
    if existing is None:
        await db.admins.insert_one({
            "email": email,
            "password_hash": hash_password(password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info(f"Seeded admin {email}")
    elif not verify_password(password, existing["password_hash"]):
        await db.admins.update_one(
            {"email": email},
            {"$set": {"password_hash": hash_password(password)}},
        )
        log.info(f"Updated admin password for {email}")


def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


async def _check_lockout(db, identifier: str) -> None:
    rec = await db.login_attempts.find_one({"_id": identifier})
    if not rec:
        return
    if rec.get("count", 0) >= LOCKOUT_AFTER:
        last = rec.get("last")
        if last:
            last_dt = datetime.fromisoformat(last)
            unlocked_at = last_dt + timedelta(minutes=LOCKOUT_MINUTES)
            if datetime.now(timezone.utc) < unlocked_at:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many failed attempts. Try again in 15 minutes.",
                )
            await db.login_attempts.delete_one({"_id": identifier})


async def _record_failed_attempt(db, identifier: str) -> None:
    await db.login_attempts.update_one(
        {"_id": identifier},
        {
            "$inc": {"count": 1},
            "$set": {"last": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )


async def _clear_attempts(db, identifier: str) -> None:
    await db.login_attempts.delete_one({"_id": identifier})


async def login(db, request: Request, payload: LoginRequest) -> dict:
    email = payload.email.strip().lower()
    ip = (request.client.host if request.client else "anon")
    identifier = f"{ip}:{email}"

    await _check_lockout(db, identifier)

    admin = await db.admins.find_one({"email": email})
    if not admin or not verify_password(payload.password, admin["password_hash"]):
        await _record_failed_attempt(db, identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await _clear_attempts(db, identifier)
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
