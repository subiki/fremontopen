"""CueStats backend — read-only API + admin routes."""
import os
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from pydantic import BaseModel, Field

from database import make_engine, init_db
import database as T
from ai_agent import ask_agent
from auth import LoginRequest, login as auth_login, seed_admin, require_admin
from admin_routes import make_admin_router
from users import make_user_router
from extras_routes import make_extras_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=True)

engine = make_engine()

app = FastAPI(title="CueStats API")
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("cuestats")


# ---------- Schemas ----------
class ChatRequest(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message: str


# ---------- Helpers ----------
def _row_to_dict(row) -> Dict[str, Any]:
    return dict(row._mapping)


async def _gather_stats() -> Dict[str, Any]:
    async with engine.connect() as conn:
        t_count = (await conn.execute(
            select(func.count()).select_from(T.tournaments)
        )).scalar()

        m_count = (await conn.execute(
            select(func.count()).select_from(T.matches)
            .where(T.matches.c.winner_name.isnot(None))
        )).scalar()

        rows = (await conn.execute(
            select(T.players).order_by(T.players.c.wins.desc())
        )).fetchall()

    players = [_row_to_dict(r) for r in rows]
    for p in players:
        total = p.get("wins", 0) + p.get("losses", 0)
        p["win_rate"] = round((p["wins"] / total) * 100, 1) if total else 0.0

    return {
        "total_tournaments": t_count,
        "total_matches": m_count,
        "total_players": len(players),
        "players": players,
    }


async def _all_matches() -> List[Dict[str, Any]]:
    async with engine.connect() as conn:
        rows = (await conn.execute(
            select(T.matches).where(
                T.matches.c.winner_name.isnot(None),
                T.matches.c.loser_name.isnot(None),
            )
        )).fetchall()
    return [_row_to_dict(r) for r in rows]


async def _get_last_sync() -> Optional[Dict[str, Any]]:
    async with engine.connect() as conn:
        row = (await conn.execute(
            select(T.sync_meta).where(T.sync_meta.c.key == "last")
        )).fetchone()
    return row.value if row else None


# ---------- Public Routes ----------
@api_router.get("/")
async def root():
    return {"service": "CueStats API", "status": "ok"}


@api_router.get("/health")
async def health():
    meta = await _get_last_sync()
    last = (meta or {}).get("last_synced_at")
    stale = False
    if last:
        age_days = (datetime.now(timezone.utc) - datetime.fromisoformat(last)).total_seconds() / 86400
        stale = age_days > 14
    body = {"status": "ok", "stale": stale, "last_synced_at": last}
    if stale:
        raise HTTPException(status_code=503, detail=body)
    return body


@api_router.get("/sync/status")
async def sync_status():
    meta = await _get_last_sync()
    return meta or {"status": "never_synced"}


@api_router.get("/stats")
async def get_stats():
    stats = await _gather_stats()
    meta = await _get_last_sync()
    stats["last_synced_at"] = (meta or {}).get("last_synced_at")

    async with engine.connect() as conn:
        rows = (await conn.execute(
            select(T.matches)
            .where(T.matches.c.winner_name.isnot(None))
            .order_by(T.matches.c.completed_at.desc())
            .limit(10)
        )).fetchall()

    stats["recent_matches"] = [_row_to_dict(r) for r in rows]
    return stats


@api_router.get("/tournaments")
async def list_tournaments():
    async with engine.connect() as conn:
        rows = (await conn.execute(
            select(T.tournaments).order_by(T.tournaments.c.started_at.desc())
        )).fetchall()
    return [_row_to_dict(r) for r in rows]


@api_router.get("/tournaments/{tournament_id}")
async def get_tournament(tournament_id: int):
    async with engine.connect() as conn:
        t_row = (await conn.execute(
            select(T.tournaments).where(T.tournaments.c.id == tournament_id)
        )).fetchone()
        if not t_row:
            raise HTTPException(status_code=404, detail="Tournament not found")

        m_rows = (await conn.execute(
            select(T.matches)
            .where(T.matches.c.tournament_id == tournament_id)
            .order_by(T.matches.c.round)
        )).fetchall()

    return {
        "tournament": _row_to_dict(t_row),
        "matches": [_row_to_dict(r) for r in m_rows],
    }


@api_router.get("/players")
async def list_players(q: Optional[str] = None):
    async with engine.connect() as conn:
        stmt = select(T.players).order_by(T.players.c.wins.desc())
        if q:
            stmt = stmt.where(T.players.c.name.ilike(f"%{q}%"))
        rows = (await conn.execute(stmt)).fetchall()
    return [_row_to_dict(r) for r in rows]


@api_router.get("/players/{name}")
async def get_player(name: str):
    async with engine.connect() as conn:
        p_row = (await conn.execute(
            select(T.players).where(T.players.c.name == name)
        )).fetchone()
        if not p_row:
            raise HTTPException(status_code=404, detail="Player not found")

        m_rows = (await conn.execute(
            select(T.matches).where(
                (T.matches.c.winner_name == name) | (T.matches.c.loser_name == name)
            )
        )).fetchall()

    matches = [_row_to_dict(r) for r in m_rows]

    h2h: Dict[str, Dict[str, int]] = {}
    for m in matches:
        if m["winner_name"] == name:
            opp = m["loser_name"]
            h2h.setdefault(opp, {"wins": 0, "losses": 0})["wins"] += 1
        else:
            opp = m["winner_name"]
            h2h.setdefault(opp, {"wins": 0, "losses": 0})["losses"] += 1
    h2h_list = [
        {"opponent": k, "wins": v["wins"], "losses": v["losses"]}
        for k, v in h2h.items()
    ]
    h2h_list.sort(key=lambda x: x["wins"] + x["losses"], reverse=True)

    return {"player": _row_to_dict(p_row), "matches": matches, "head_to_head": h2h_list}


@api_router.get("/leaderboard")
async def leaderboard(limit: int = 25):
    async with engine.connect() as conn:
        rows = (await conn.execute(
            select(T.players).order_by(T.players.c.wins.desc()).limit(limit)
        )).fetchall()
    return [_row_to_dict(r) for r in rows]


@api_router.get("/matches")
async def list_matches(limit: int = 100):
    async with engine.connect() as conn:
        rows = (await conn.execute(
            select(T.matches)
            .where(T.matches.c.winner_name.isnot(None))
            .order_by(T.matches.c.completed_at.desc())
            .limit(limit)
        )).fetchall()
    return [_row_to_dict(r) for r in rows]


@api_router.post("/chat")
async def chat(req: ChatRequest):
    session_id = req.session_id
    question = req.message.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Empty message")

    now = datetime.now(timezone.utc).isoformat()
    user_msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "user",
        "content": question,
        "timestamp": now,
    }

    async with engine.begin() as conn:
        await conn.execute(
            T.chat_messages.insert().values(
                id=user_msg["id"],
                session_id=session_id,
                role="user",
                content=question,
                msg_ts=now,
            )
        )

    stats = await _gather_stats()
    matches = await _all_matches()

    try:
        answer = await ask_agent(question, session_id, stats, matches)
    except Exception as e:
        logger.exception("AI agent error")
        raise HTTPException(status_code=500, detail=f"AI error: {e}")

    ans_now = datetime.now(timezone.utc).isoformat()
    assistant_msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "assistant",
        "content": answer,
        "timestamp": ans_now,
    }

    async with engine.begin() as conn:
        await conn.execute(
            T.chat_messages.insert().values(
                id=assistant_msg["id"],
                session_id=session_id,
                role="assistant",
                content=answer,
                msg_ts=ans_now,
            )
        )

    return {
        "session_id": session_id,
        "answer": answer,
        "user_message": user_msg,
        "assistant_message": assistant_msg,
    }


@api_router.get("/chat/history/{session_id}")
async def chat_history(session_id: str):
    async with engine.connect() as conn:
        rows = (await conn.execute(
            select(T.chat_messages)
            .where(T.chat_messages.c.session_id == session_id)
            .order_by(T.chat_messages.c.msg_ts)
        )).fetchall()
    result = []
    for r in rows:
        d = _row_to_dict(r)
        d["timestamp"] = d.pop("msg_ts")
        result.append(d)
    return result


# ---------- Auth Routes ----------
@auth_router.post("/login")
async def login_route(payload: LoginRequest, request: Request):
    return await auth_login(engine, request, payload)


@auth_router.get("/me")
async def auth_me(admin_email: str = Depends(require_admin)):
    return {"email": admin_email, "role": "admin"}


# ---------- Wire up ----------
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(make_admin_router(engine))
app.include_router(make_user_router(engine))
app.include_router(make_extras_router(engine))

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await init_db(engine)
    await seed_admin(engine)


@app.on_event("shutdown")
async def on_shutdown():
    await engine.dispose()
