"""SQLAlchemy async engine and cache table definitions.

Local tooling uses SQLite at ``backend/cuestats_dev.db``. The deployed site is
static and reads ``frontend/public/data/cache.json`` only.
"""
import os
from sqlalchemy import (
    MetaData, Table, Column,
    Integer, String, Float, JSON,
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
