"""SQLAlchemy async engine, all table definitions, and schema initialisation.

Dev  (Replit):  DATABASE_URL=sqlite+aiosqlite:///./cuestats_dev.db
Prod (DreamHost MySQL): DATABASE_URL=mysql+aiomysql://user:pass@host/dbname
"""
import os
from sqlalchemy import (
    MetaData, Table, Column,
    Integer, String, Float, Text, JSON,
)
from sqlalchemy.ext.asyncio import create_async_engine

metadata = MetaData()

tournaments = Table(
    "tournaments", metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(500)),
    Column("game", String(200)),
    Column("state", String(100)),
    Column("started_at", String(60)),
    Column("completed_at", String(60)),
    Column("participants_count", Integer, default=0),
    Column("url", String(1000)),
    Column("challonge_updated_at", String(100)),
)

matches = Table(
    "matches", metadata,
    Column("id", String(100), primary_key=True),
    Column("tournament_id", Integer, index=True),
    Column("tournament_name", String(500)),
    Column("round", Integer),
    Column("state", String(100)),
    Column("scores", String(200)),
    Column("winner_id", Integer),
    Column("loser_id", Integer),
    Column("winner_name", String(500), index=True),
    Column("loser_name", String(500), index=True),
    Column("completed_at", String(60)),
)

players = Table(
    "players", metadata,
    Column("id", String(100), primary_key=True),
    Column("name", String(500), unique=True),
    Column("wins", Integer, default=0),
    Column("losses", Integer, default=0),
    Column("win_rate", Float, default=0.0),
    Column("fargo", Integer, nullable=True),
)

admins = Table(
    "admins", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("email", String(500), unique=True),
    Column("password_hash", String(500)),
    Column("created_at", String(60)),
)

login_attempts = Table(
    "login_attempts", metadata,
    Column("identifier", String(500), primary_key=True),
    Column("count", Integer, default=0),
    Column("last_at", String(60)),
)

users = Table(
    "users", metadata,
    Column("id", String(100), primary_key=True),
    Column("provider", String(50)),
    Column("provider_user_id", String(500)),
    Column("display_name", String(500)),
    Column("email", String(500)),
    Column("avatar_url", String(1000)),
    Column("claimed_player", String(500), nullable=True),
    Column("claimed_at", String(60), nullable=True),
    Column("created_at", String(60)),
    Column("last_login_at", String(60)),
)

user_follows = Table(
    "user_follows", metadata,
    Column("user_id", String(100), primary_key=True),
    Column("player_name", String(500), primary_key=True),
)

chat_messages = Table(
    "chat_messages", metadata,
    Column("id", String(100), primary_key=True),
    Column("session_id", String(100), index=True),
    Column("role", String(50)),
    Column("content", Text),
    Column("msg_ts", String(60)),
)

audit_log = Table(
    "audit_log", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("action", String(200)),
    Column("payload", JSON),
    Column("at", String(60)),
)

sync_meta = Table(
    "sync_meta", metadata,
    Column("key", String(100), primary_key=True),
    Column("value", JSON),
)


def make_engine(database_url: str = None):
    url = database_url or os.environ["DATABASE_URL"]
    kwargs = {"echo": False, "pool_pre_ping": True}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    return create_async_engine(url, **kwargs)


async def init_db(engine) -> None:
    """Create all tables if they don't already exist (idempotent)."""
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)
