"""User SSO (Discord, Facebook, Google) — session JWT, follow, claim player.

This is SEPARATE from the admin auth in auth.py. Admin tokens have
role=admin/type=access; user tokens have role=user/type=session.
"""
import os
import uuid
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, insert, update, func

import database as T

log = logging.getLogger("cuestats.users")

JWT_ALGORITHM = "HS256"
USER_TOKEN_TTL_HOURS = 24 * 30  # 30 days

DISCORD = {
    "client_id": os.environ.get("DISCORD_CLIENT_ID", ""),
    "client_secret": os.environ.get("DISCORD_CLIENT_SECRET", ""),
    "auth_url": "https://discord.com/oauth2/authorize",
    "token_url": "https://discord.com/api/oauth2/token",
    "user_url": "https://discord.com/api/users/@me",
    "scope": "identify email",
}
FACEBOOK = {
    "client_id": os.environ.get("FACEBOOK_APP_ID", ""),
    "client_secret": os.environ.get("FACEBOOK_APP_SECRET", ""),
    "auth_url": "https://www.facebook.com/v18.0/dialog/oauth",
    "token_url": "https://graph.facebook.com/v18.0/oauth/access_token",
    "user_url": "https://graph.facebook.com/me",
    "scope": "public_profile,email",
}
GOOGLE = {
    "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
    "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET", ""),
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
    "token_url": "https://oauth2.googleapis.com/token",
    "user_url": "https://www.googleapis.com/oauth2/v3/userinfo",
    "scope": "openid email profile",
}
PROVIDERS = {"discord": DISCORD, "facebook": FACEBOOK, "google": GOOGLE}


def _jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET not configured")
    return secret


def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def _redirect_uri() -> str:
    return f"{_frontend_url()}/auth/callback"


def create_user_token(user_id: str, provider: str) -> str:
    payload = {
        "sub": user_id,
        "role": "user",
        "type": "session",
        "provider": provider,
        "exp": datetime.now(timezone.utc) + timedelta(hours=USER_TOKEN_TTL_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def _extract_user_token(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


def require_user(request: Request) -> str:
    token = _extract_user_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not signed in")
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session")
    if payload.get("role") != "user" or payload.get("type") != "session":
        raise HTTPException(status_code=401, detail="Invalid session token")
    return payload["sub"]


def optional_user(request: Request) -> Optional[str]:
    try:
        return require_user(request)
    except HTTPException:
        return None


# ---------- Schemas ----------
class ClaimRequest(BaseModel):
    player_name: str = Field(min_length=1, max_length=200)


class FollowRequest(BaseModel):
    player_name: str = Field(min_length=1, max_length=200)


# ---------- Helpers ----------
async def _get_followed(conn, user_id: str) -> List[str]:
    rows = (await conn.execute(
        select(T.user_follows.c.player_name)
        .where(T.user_follows.c.user_id == user_id)
    )).fetchall()
    return [r.player_name for r in rows]


async def _upsert_user(engine, provider: str, provider_user_id: str,
                       display_name: str, email: Optional[str],
                       avatar_url: Optional[str]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    async with engine.begin() as conn:
        row = (await conn.execute(
            select(T.users).where(
                T.users.c.provider == provider,
                T.users.c.provider_user_id == str(provider_user_id),
            )
        )).fetchone()

        if row:
            user_id = row.id
            await conn.execute(
                update(T.users).where(T.users.c.id == user_id).values(
                    display_name=display_name,
                    email=email,
                    avatar_url=avatar_url,
                    last_login_at=now,
                )
            )
        else:
            user_id = str(uuid.uuid4())
            await conn.execute(insert(T.users).values(
                id=user_id,
                provider=provider,
                provider_user_id=str(provider_user_id),
                display_name=display_name,
                email=email,
                avatar_url=avatar_url,
                claimed_player=None,
                claimed_at=None,
                created_at=now,
                last_login_at=now,
            ))

        user_row = (await conn.execute(
            select(T.users).where(T.users.c.id == user_id)
        )).fetchone()
        followed = await _get_followed(conn, user_id)

    user = dict(user_row._mapping)
    user["followed_players"] = followed
    return user


def _public_self(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": user["id"],
        "provider": user["provider"],
        "display_name": user.get("display_name"),
        "avatar_url": user.get("avatar_url"),
        "claimed_player": user.get("claimed_player"),
        "followed_players": user.get("followed_players", []),
    }


# ---------- Router factory ----------
def make_user_router(engine):
    router = APIRouter(prefix="/api")

    @router.get("/auth/{provider}/start")
    async def start_oauth(provider: str):
        cfg = PROVIDERS.get(provider)
        if not cfg or not cfg["client_id"]:
            raise HTTPException(status_code=400, detail=f"Provider '{provider}' not configured")
        state = secrets.token_urlsafe(24)
        params = {
            "client_id": cfg["client_id"],
            "redirect_uri": _redirect_uri(),
            "response_type": "code",
            "scope": cfg["scope"],
            "state": f"{provider}:{state}",
        }
        if provider == "google":
            params["access_type"] = "online"
            params["prompt"] = "select_account"
        return {
            "auth_url": f"{cfg['auth_url']}?{urlencode(params)}",
            "state": state,
            "provider": provider,
        }

    @router.post("/auth/{provider}/callback")
    async def oauth_callback(provider: str, code: str = Query(...)):
        cfg = PROVIDERS.get(provider)
        if not cfg or not cfg["client_id"]:
            raise HTTPException(status_code=400, detail=f"Provider '{provider}' not configured")

        async with httpx.AsyncClient(timeout=15) as client:
            try:
                if provider == "facebook":
                    tr = await client.get(cfg["token_url"], params={
                        "client_id": cfg["client_id"],
                        "client_secret": cfg["client_secret"],
                        "redirect_uri": _redirect_uri(),
                        "code": code,
                    })
                else:
                    tr = await client.post(cfg["token_url"], data={
                        "client_id": cfg["client_id"],
                        "client_secret": cfg["client_secret"],
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": _redirect_uri(),
                    }, headers={"Accept": "application/json"})
                tr.raise_for_status()
            except Exception as e:
                log.exception(f"Token exchange failed for {provider}")
                raise HTTPException(status_code=400, detail=f"Failed to exchange code: {e}")

            token_data = tr.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise HTTPException(status_code=400, detail="No access_token in provider response")

            try:
                if provider == "facebook":
                    ur = await client.get(cfg["user_url"], params={
                        "fields": "id,name,email,picture.type(large)",
                        "access_token": access_token,
                    })
                else:
                    ur = await client.get(cfg["user_url"], headers={
                        "Authorization": f"Bearer {access_token}",
                    })
                ur.raise_for_status()
            except Exception as e:
                log.exception(f"Profile fetch failed for {provider}")
                raise HTTPException(status_code=400, detail=f"Failed to fetch profile: {e}")

            profile = ur.json()

        if provider == "discord":
            pid = profile.get("id")
            email = profile.get("email")
            display_name = profile.get("global_name") or profile.get("username") or "User"
            avatar_hash = profile.get("avatar")
            avatar_url = f"https://cdn.discordapp.com/avatars/{pid}/{avatar_hash}.png" if avatar_hash else None
        elif provider == "facebook":
            pid = profile.get("id")
            email = profile.get("email")
            display_name = profile.get("name") or "User"
            avatar_url = ((profile.get("picture") or {}).get("data") or {}).get("url")
        elif provider == "google":
            pid = profile.get("sub")
            email = profile.get("email")
            display_name = profile.get("name") or (email.split("@")[0] if email else "User")
            avatar_url = profile.get("picture")
        else:
            raise HTTPException(status_code=400, detail="Unknown provider")

        if not pid:
            raise HTTPException(status_code=400, detail="Provider did not return a user id")

        user = await _upsert_user(engine, provider, pid, display_name, email, avatar_url)
        token = create_user_token(user["id"], provider)
        return {"token": token, "user": _public_self(user)}

    @router.get("/me")
    async def get_me(user_id: str = Depends(require_user)):
        async with engine.connect() as conn:
            row = (await conn.execute(
                select(T.users).where(T.users.c.id == user_id)
            )).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            followed = await _get_followed(conn, user_id)
        user = dict(row._mapping)
        user["followed_players"] = followed
        return _public_self(user)

    @router.post("/me/claim")
    async def claim_player(payload: ClaimRequest, user_id: str = Depends(require_user)):
        name = payload.player_name.strip()
        async with engine.begin() as conn:
            p_row = (await conn.execute(
                select(T.players).where(T.players.c.name == name)
            )).fetchone()
            if not p_row:
                raise HTTPException(status_code=404, detail="Player not found")

            existing = (await conn.execute(
                select(T.users.c.id).where(
                    T.users.c.claimed_player == name,
                    T.users.c.id != user_id,
                )
            )).fetchone()
            if existing:
                raise HTTPException(status_code=409, detail="That player has already been claimed")

            now = datetime.now(timezone.utc).isoformat()
            await conn.execute(
                update(T.users).where(T.users.c.id == user_id)
                .values(claimed_player=name, claimed_at=now)
            )
        return {"claimed_player": name}

    @router.delete("/me/claim")
    async def unclaim_player(user_id: str = Depends(require_user)):
        async with engine.begin() as conn:
            await conn.execute(
                update(T.users).where(T.users.c.id == user_id)
                .values(claimed_player=None, claimed_at=None)
            )
        return {"claimed_player": None}

    @router.post("/me/follow")
    async def follow_player(payload: FollowRequest, user_id: str = Depends(require_user)):
        name = payload.player_name.strip()
        async with engine.begin() as conn:
            exists = (await conn.execute(
                select(T.user_follows).where(
                    T.user_follows.c.user_id == user_id,
                    T.user_follows.c.player_name == name,
                )
            )).fetchone()
            if not exists:
                await conn.execute(
                    insert(T.user_follows).values(user_id=user_id, player_name=name)
                )
            followed = await _get_followed(conn, user_id)
        return {"followed_players": followed}

    @router.delete("/me/follow/{name}")
    async def unfollow_player(name: str, user_id: str = Depends(require_user)):
        async with engine.begin() as conn:
            await conn.execute(
                T.user_follows.delete().where(
                    T.user_follows.c.user_id == user_id,
                    T.user_follows.c.player_name == name,
                )
            )
            followed = await _get_followed(conn, user_id)
        return {"followed_players": followed}

    @router.get("/players/{name}/claim-info")
    async def player_claim_info(name: str):
        async with engine.connect() as conn:
            count = (await conn.execute(
                select(func.count()).select_from(T.users)
                .where(T.users.c.claimed_player == name)
            )).scalar()
        return {"claimed": count > 0}

    return router
