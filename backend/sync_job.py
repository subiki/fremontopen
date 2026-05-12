"""Standalone Challonge → MongoDB sync job.

Run via cron:
    0 23 * * 6 cd /home/USER/cuestats/backend && ./venv/bin/python sync_job.py

The web app NEVER calls Challonge — only this script does.

Optimization strategy (≤ 500 Challonge calls/month budget):
- 1 call per run for the tournament list (needed to discover new ones).
- COMPLETED tournaments are NEVER refetched once cached. The bracket is
  immutable, so even if Challonge "touches" the updated_at, we skip.
- Pending / in_progress tournaments are refetched only if their updated_at
  changed since the last successful sync.
- A brand-new tournament costs 2 calls (participants + matches).

Steady-state cost for Fremont Open (1 weekly tournament):
- 1 list call/week + 2 calls for the new tournament + 0 refetches = ~3 calls/week
- ~12-15 calls/month vs 500/month free quota.

Use --force to override the skip and rebuild everything.
Use --tournament <id> to refresh a single tournament regardless of state.
"""
import os
import sys
import logging
import asyncio
import uuid
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from challonge_client import ChallongeClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
log = logging.getLogger("sync_job")

# Challonge tournament states that are considered immutable (frozen bracket).
FROZEN_STATES = {"complete", "ended"}


def _norm(name):
    return (name or "").strip()


async def _refresh_tournament(db, cc, t, t_doc, loop) -> int:
    """Fetch participants + matches for one tournament. Returns API call count (2)."""
    t_id = t.get("id")
    participants = await loop.run_in_executor(None, cc.list_participants, t_id)
    matches = await loop.run_in_executor(None, cc.list_matches, t_id)

    pid_to_name: Dict[int, str] = {}
    for p in participants:
        name = _norm(p.get("display_name") or p.get("name"))
        if not name:
            continue
        pid_to_name[p.get("id")] = name
        for gpid in p.get("group_player_ids") or []:
            pid_to_name[gpid] = name

    await db.matches.delete_many({"tournament_id": t_id})
    for m in matches:
        winner_id = m.get("winner_id")
        loser_id = m.get("loser_id")
        match_doc = {
            "id": str(m.get("id")),
            "tournament_id": t_id,
            "tournament_name": t_doc["name"],
            "round": m.get("round"),
            "state": m.get("state"),
            "scores": m.get("scores_csv"),
            "winner_id": winner_id,
            "loser_id": loser_id,
            "winner_name": pid_to_name.get(winner_id) if winner_id else None,
            "loser_name": pid_to_name.get(loser_id) if loser_id else None,
            "completed_at": m.get("completed_at"),
        }
        await db.matches.update_one(
            {"id": match_doc["id"]}, {"$set": match_doc}, upsert=True
        )
    return 2


async def _rebuild_players(db) -> int:
    """Recompute the players collection from matches. Returns total players."""
    pipeline_w = [
        {"$match": {"winner_name": {"$ne": None}, "loser_name": {"$ne": None}}},
        {"$group": {"_id": "$winner_name", "wins": {"$sum": 1}}},
    ]
    pipeline_l = [
        {"$match": {"winner_name": {"$ne": None}, "loser_name": {"$ne": None}}},
        {"$group": {"_id": "$loser_name", "losses": {"$sum": 1}}},
    ]
    wins = {r["_id"]: r["wins"] async for r in db.matches.aggregate(pipeline_w)}
    losses = {r["_id"]: r["losses"] async for r in db.matches.aggregate(pipeline_l)}

    all_names = set(wins) | set(losses)
    await db.players.delete_many({})
    for name in all_names:
        w, l = wins.get(name, 0), losses.get(name, 0)
        total = w + l
        await db.players.insert_one({
            "id": str(uuid.uuid4()),
            "name": name,
            "wins": w,
            "losses": l,
            "win_rate": round((w / total) * 100, 1) if total else 0.0,
        })
    return len(all_names)


async def run_sync(force: bool = False, only_tournament: Optional[int] = None) -> Dict[str, Any]:
    mongo_url = os.environ["MONGO_URL"]
    db = AsyncIOMotorClient(mongo_url)[os.environ["DB_NAME"]]
    cc = ChallongeClient()
    started = datetime.now(timezone.utc).isoformat()
    loop = asyncio.get_event_loop()

    tournaments = await loop.run_in_executor(None, cc.list_tournaments, "all")
    log.info(f"Challonge returned {len(tournaments)} tournaments")

    meta = await db.sync_meta.find_one({"_id": "tournaments"}) or {}
    seen: Dict[str, str] = meta.get("seen", {})

    api_calls = 1  # the list call
    fetched = 0
    skipped_frozen = 0
    skipped_unchanged = 0

    for t in tournaments:
        t_id = t.get("id")
        if not t_id:
            continue
        if only_tournament and t_id != only_tournament:
            continue

        t_doc = {
            "id": t_id,
            "name": t.get("name"),
            "game": t.get("game_name") or t.get("tournament_type"),
            "state": t.get("state"),
            "started_at": t.get("started_at"),
            "completed_at": t.get("completed_at"),
            "participants_count": t.get("participants_count", 0),
            "url": t.get("full_challonge_url") or t.get("url"),
        }
        await db.tournaments.update_one({"id": t_id}, {"$set": t_doc}, upsert=True)

        challonge_updated = t.get("updated_at") or ""
        cached_updated = seen.get(str(t_id))
        is_frozen = (t_doc["state"] in FROZEN_STATES)

        if not force:
            # Optimization: completed tournaments are immutable.
            # If we've cached them once, never refetch.
            if is_frozen and cached_updated:
                skipped_frozen += 1
                continue
            # Non-frozen: only refetch when updated_at moved.
            if cached_updated == challonge_updated and cached_updated:
                skipped_unchanged += 1
                continue

        try:
            api_calls += await _refresh_tournament(db, cc, t, t_doc, loop)
        except Exception as e:
            log.warning(f"failed to fetch t={t_id}: {e}")
            continue

        seen[str(t_id)] = challonge_updated
        fetched += 1
        state_label = "complete" if is_frozen else (t_doc["state"] or "?")
        log.info(f"  refreshed t={t_id} state={state_label} ({t_doc['name']})")

    player_count = await _rebuild_players(db)

    finished = datetime.now(timezone.utc).isoformat()
    summary = {
        "last_synced_at": finished,
        "started_at": started,
        "status": "ok",
        "tournaments_total": len(tournaments),
        "tournaments_refreshed": fetched,
        "tournaments_skipped_frozen": skipped_frozen,
        "tournaments_skipped_unchanged": skipped_unchanged,
        "players": player_count,
        "challonge_api_calls": api_calls,
    }
    await db.sync_meta.update_one({"_id": "last"}, {"$set": summary}, upsert=True)
    await db.sync_meta.update_one(
        {"_id": "tournaments"}, {"$set": {"seen": seen}}, upsert=True
    )

    log.info(f"Sync complete: {summary}")
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="CueStats Challonge sync")
    parser.add_argument("--force", action="store_true", help="Refetch ALL tournaments, including completed.")
    parser.add_argument("--tournament", type=int, help="Refresh a single tournament by Challonge id.")
    args = parser.parse_args()
    try:
        result = asyncio.run(run_sync(force=args.force, only_tournament=args.tournament))
        print(result)
        return 0
    except Exception as e:
        log.exception(f"Sync failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
