"""Standalone Challonge → MySQL/SQLite sync job.

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
from sqlalchemy import select, insert, update

from database import make_engine, init_db
import database as T
from challonge_client import ChallongeClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
log = logging.getLogger("sync_job")

FROZEN_STATES = {"complete", "ended"}


def _norm(name):
    return (name or "").strip()


async def _rebuild_players(conn) -> int:
    """Recompute the players table from matches. Takes an open connection.
    Returns total player count."""
    rows = (await conn.execute(
        select(T.matches).where(
            T.matches.c.winner_name.isnot(None),
            T.matches.c.loser_name.isnot(None),
        )
    )).fetchall()

    wins: Dict[str, int] = {}
    losses: Dict[str, int] = {}
    for r in rows:
        wins[r.winner_name] = wins.get(r.winner_name, 0) + 1
        losses[r.loser_name] = losses.get(r.loser_name, 0) + 1

    all_names = set(wins) | set(losses)

    # Fetch existing fargo values so we don't lose them on rebuild
    existing_rows = (await conn.execute(
        select(T.players.c.name, T.players.c.fargo)
    )).fetchall()
    existing_fargo = {r.name: r.fargo for r in existing_rows if r.fargo is not None}

    await conn.execute(T.players.delete())
    for name in all_names:
        w = wins.get(name, 0)
        l = losses.get(name, 0)
        total = w + l
        await conn.execute(insert(T.players).values(
            id=str(uuid.uuid4()),
            name=name,
            wins=w,
            losses=l,
            win_rate=round((w / total) * 100, 1) if total else 0.0,
            fargo=existing_fargo.get(name),
        ))
    return len(all_names)


async def _refresh_tournament(conn, cc, t, t_doc, loop) -> int:
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

    await conn.execute(
        T.matches.delete().where(T.matches.c.tournament_id == t_id)
    )
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
        existing = (await conn.execute(
            select(T.matches).where(T.matches.c.id == match_doc["id"])
        )).fetchone()
        if existing:
            await conn.execute(
                update(T.matches).where(T.matches.c.id == match_doc["id"]).values(**match_doc)
            )
        else:
            await conn.execute(insert(T.matches).values(**match_doc))
    return 2


async def _get_sync_meta(conn, key: str) -> Any:
    row = (await conn.execute(
        select(T.sync_meta).where(T.sync_meta.c.key == key)
    )).fetchone()
    return row.value if row else None


async def _set_sync_meta(conn, key: str, value: Any) -> None:
    existing = (await conn.execute(
        select(T.sync_meta).where(T.sync_meta.c.key == key)
    )).fetchone()
    if existing:
        await conn.execute(update(T.sync_meta).where(T.sync_meta.c.key == key).values(value=value))
    else:
        await conn.execute(insert(T.sync_meta).values(key=key, value=value))


async def run_sync(force: bool = False, only_tournament: Optional[int] = None) -> Dict[str, Any]:
    engine = make_engine()
    await init_db(engine)
    cc = ChallongeClient()
    started = datetime.now(timezone.utc).isoformat()
    loop = asyncio.get_event_loop()

    tournaments = await loop.run_in_executor(None, cc.list_tournaments, "all")
    log.info(f"Challonge returned {len(tournaments)} tournaments")

    api_calls = 1
    fetched = 0
    skipped_frozen = 0
    skipped_unchanged = 0

    async with engine.begin() as conn:
        seen: Dict[str, str] = (await _get_sync_meta(conn, "tournaments_seen")) or {}

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
                "challonge_updated_at": t.get("updated_at") or "",
            }

            existing_t = (await conn.execute(
                select(T.tournaments).where(T.tournaments.c.id == t_id)
            )).fetchone()
            if existing_t:
                await conn.execute(
                    update(T.tournaments).where(T.tournaments.c.id == t_id).values(**t_doc)
                )
            else:
                await conn.execute(insert(T.tournaments).values(**t_doc))

            challonge_updated = t.get("updated_at") or ""
            cached_updated = seen.get(str(t_id))
            is_frozen = (t_doc["state"] in FROZEN_STATES)

            if not force:
                if is_frozen and cached_updated:
                    skipped_frozen += 1
                    continue
                if cached_updated == challonge_updated and cached_updated:
                    skipped_unchanged += 1
                    continue

            try:
                api_calls += await _refresh_tournament(conn, cc, t, t_doc, loop)
            except Exception as e:
                log.warning(f"failed to fetch t={t_id}: {e}")
                continue

            seen[str(t_id)] = challonge_updated
            fetched += 1
            state_label = "complete" if is_frozen else (t_doc["state"] or "?")
            log.info(f"  refreshed t={t_id} state={state_label} ({t_doc['name']})")

        player_count = await _rebuild_players(conn)

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
        await _set_sync_meta(conn, "last", summary)
        await _set_sync_meta(conn, "tournaments_seen", seen)

    await engine.dispose()
    log.info(f"Sync complete: {summary}")
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="CueStats Challonge sync")
    parser.add_argument("--force", action="store_true",
                        help="Refetch ALL tournaments, including completed.")
    parser.add_argument("--tournament", type=int,
                        help="Refresh a single tournament by Challonge id.")
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
