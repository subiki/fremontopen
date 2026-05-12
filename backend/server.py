"""CueStats backend — read-only API + admin routes."""
import os
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from ai_agent import ask_agent
from auth import LoginRequest, login as auth_login, seed_admin, require_admin  # noqa: F401
from admin_routes import make_admin_router
from users import make_user_router
from extras_routes import make_extras_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="CueStats API")
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("cuestats")


# ---------- Schemas ----------
class ChatRequest(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message: str


# ---------- Helpers ----------
async def _gather_stats() -> Dict[str, Any]:
    tournaments = await db.tournaments.count_documents({})
    matches = await db.matches.count_documents({"winner_name": {"$ne": None}})
    players = await db.players.find({}, {"_id": 0}).sort("wins", -1).to_list(length=2000)
    for p in players:
        total = p.get("wins", 0) + p.get("losses", 0)
        p["win_rate"] = round((p.get("wins", 0) / total) * 100, 1) if total else 0.0
    return {
        "total_tournaments": tournaments,
        "total_matches": matches,
        "total_players": len(players),
        "players": players,
    }


async def _all_matches() -> List[Dict[str, Any]]:
    return await db.matches.find(
        {"winner_name": {"$ne": None}, "loser_name": {"$ne": None}},
        {"_id": 0},
    ).to_list(length=20000)


async def _get_last_sync() -> Optional[Dict[str, Any]]:
    return await db.sync_meta.find_one({"_id": "last"}, {"_id": 0})


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
    recent = await db.matches.find(
        {"winner_name": {"$ne": None}}, {"_id": 0}
    ).sort("completed_at", -1).limit(10).to_list(length=10)
    stats["recent_matches"] = recent
    return stats


@api_router.get("/tournaments")
async def list_tournaments():
    items = await db.tournaments.find({}, {"_id": 0}).sort("started_at", -1).to_list(length=2000)
    return items


@api_router.get("/tournaments/{tournament_id}")
async def get_tournament(tournament_id: int):
    t = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    matches = await db.matches.find(
        {"tournament_id": tournament_id}, {"_id": 0}
    ).sort("round", 1).to_list(length=2000)
    return {"tournament": t, "matches": matches}


@api_router.get("/players")
async def list_players(q: Optional[str] = None):
    query: Dict[str, Any] = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    players = await db.players.find(query, {"_id": 0}).sort("wins", -1).to_list(length=5000)
    return players


@api_router.get("/players/{name}")
async def get_player(name: str):
    player = await db.players.find_one({"name": name}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    matches = await db.matches.find(
        {"$or": [{"winner_name": name}, {"loser_name": name}]},
        {"_id": 0},
    ).to_list(length=5000)

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

    return {"player": player, "matches": matches, "head_to_head": h2h_list}


@api_router.get("/leaderboard")
async def leaderboard(limit: int = 25):
    players = await db.players.find({}, {"_id": 0}).sort("wins", -1).to_list(length=limit)
    return players


@api_router.get("/matches")
async def list_matches(limit: int = 100):
    matches = await db.matches.find(
        {"winner_name": {"$ne": None}}, {"_id": 0}
    ).sort("completed_at", -1).limit(limit).to_list(length=limit)
    return matches


@api_router.post("/chat")
async def chat(req: ChatRequest):
    session_id = req.session_id
    question = req.message.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Empty message")

    user_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "user",
        "content": question,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(user_doc.copy())

    stats = await _gather_stats()
    matches = await _all_matches()

    try:
        answer = await ask_agent(question, session_id, stats, matches)
    except Exception as e:
        logger.exception("AI agent error")
        raise HTTPException(status_code=500, detail=f"AI error: {e}")

    assistant_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "assistant",
        "content": answer,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(assistant_doc.copy())

    return {
        "session_id": session_id,
        "answer": answer,
        "user_message": {k: v for k, v in user_doc.items() if k != "_id"},
        "assistant_message": {k: v for k, v in assistant_doc.items() if k != "_id"},
    }


@api_router.get("/chat/history/{session_id}")
async def chat_history(session_id: str):
    msgs = await db.chat_messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(length=2000)
    return msgs


# ---------- Auth Routes ----------
@auth_router.post("/login")
async def login_route(payload: LoginRequest, request: Request):
    return await auth_login(db, request, payload)


from fastapi import Depends


@auth_router.get("/me")
async def auth_me(admin_email: str = Depends(require_admin)):
    return {"email": admin_email, "role": "admin"}


# ---------- Wire up ----------
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(make_admin_router(db))
app.include_router(make_user_router(db))
app.include_router(make_extras_router(db))

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await seed_admin(db)


@app.on_event("shutdown")
async def shutdown():
    client.close()
