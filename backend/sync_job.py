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
Use --replace to delete old public cache rows before syncing returned tournaments.
Use --tournament <id> to refresh a single tournament regardless of state.
"""
import os
import sys
import logging
import asyncio
import uuid
import argparse
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

from dotenv import load_dotenv
from sqlalchemy import select, insert, update

from database import make_engine, init_db
import database as T
from challonge_client import ChallongeClient
from name_cleaning import clean_player_name, player_name_key, load_alias_map

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
log = logging.getLogger("sync_job")

FROZEN_STATES = {"complete", "ended"}


def _norm(name):
    return clean_player_name(name)


def _name_key(name: str) -> str:
    return player_name_key(name)


def _display_score(name: str) -> tuple:
    # Prefer names that occur often, then names with intentional capitalization.
    letters = [c for c in name if c.isalpha()]
    uppercase = sum(1 for c in letters if c.isupper())
    lowercase = sum(1 for c in letters if c.islower())
    return (uppercase, -lowercase, -len(name))


def _name_parts(name: str) -> list[str]:
    return [part for part in re.split(r"[\s-]+", name.strip()) if part]


def _apply_unique_first_name_aliases(aliases: Dict[str, Optional[str]]) -> None:
    names = [name for name in aliases if name and aliases.get(name) == name]
    by_first_name: Dict[str, list[str]] = {}
    first_only: list[str] = []

    for name in names:
        parts = _name_parts(name)
        if not parts:
            continue
        first_key = parts[0].casefold()
        if len(parts) == 1:
            first_only.append(name)
        else:
            by_first_name.setdefault(first_key, []).append(name)

    for name in first_only:
        matches = by_first_name.get(name.casefold(), [])
        if len(matches) == 1:
            aliases[name] = matches[0]


def _apply_alias_overrides(aliases: Dict[str, Optional[str]]) -> None:
    override_map = load_alias_map()
    if not override_map:
        return

    for name in list(aliases.keys()):
        target = override_map.get(_name_key(name))
        if target:
            aliases[name] = target


def _canonical_name_map(match_rows) -> Dict[str, Optional[str]]:
    counts: Dict[str, Dict[str, int]] = {}
    raw_to_clean: Dict[str, Optional[str]] = {}
    for r in match_rows:
        for raw_name in (r.winner_name, r.loser_name):
            clean_name = _norm(raw_name)
            if raw_name:
                raw_to_clean[raw_name] = clean_name or None
            if not clean_name:
                continue
            key = _name_key(clean_name)
            counts.setdefault(key, {})
            counts[key][clean_name] = counts[key].get(clean_name, 0) + 1

    aliases: Dict[str, Optional[str]] = {}
    for variants in counts.values():
        canonical = sorted(
            variants,
            key=lambda n: (variants[n], *_display_score(n)),
            reverse=True,
        )[0]
        for name in variants:
            aliases[name] = canonical
    _apply_unique_first_name_aliases(aliases)
    _apply_alias_overrides(aliases)
    for raw_name, clean_name in raw_to_clean.items():
        aliases[raw_name] = aliases.get(clean_name, clean_name) if clean_name else None
    return aliases


async def _rebuild_players(conn) -> int:
    """Recompute the players table from matches. Takes an open connection.
    Returns total player count."""
    rows = (await conn.execute(
        select(T.matches).where(
            T.matches.c.winner_name.isnot(None),
            T.matches.c.loser_name.isnot(None),
        )
    )).fetchall()

    aliases = _canonical_name_map(rows)
    wins: Dict[str, int] = {}
    losses: Dict[str, int] = {}
    for r in rows:
        winner_name = aliases.get(r.winner_name, _norm(r.winner_name) or None)
        loser_name = aliases.get(r.loser_name, _norm(r.loser_name) or None)
        if winner_name != r.winner_name:
            await conn.execute(
                update(T.matches).where(T.matches.c.id == r.id).values(winner_name=winner_name)
            )
        if loser_name != r.loser_name:
            await conn.execute(
                update(T.matches).where(T.matches.c.id == r.id).values(loser_name=loser_name)
            )
        if not winner_name or not loser_name:
            continue
        wins[winner_name] = wins.get(winner_name, 0) + 1
        losses[loser_name] = losses.get(loser_name, 0) + 1

    all_names = set(wins) | set(losses)

    # Fetch existing fargo values so we don't lose them on rebuild
    existing_rows = (await conn.execute(
        select(T.players.c.name, T.players.c.fargo)
    )).fetchall()
    existing_fargo = {}
    for r in existing_rows:
        if r.fargo is None:
            continue
        fargo_name = aliases.get(r.name, _norm(r.name) or None)
        if fargo_name:
            existing_fargo[fargo_name] = r.fargo

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


async def _clear_public_cache(conn) -> None:
    """Remove public Challonge-derived data before a replacement sync."""
    await conn.execute(T.matches.delete())
    await conn.execute(T.players.delete())
    await conn.execute(T.tournaments.delete())
    await conn.execute(T.sync_meta.delete())


async def run_dedupe_only() -> Dict[str, Any]:
    """Canonicalize exact case/spacing duplicate player names without API calls."""
    engine = make_engine()
    await init_db(engine)
    async with engine.begin() as conn:
        before = (await conn.execute(select(T.players))).fetchall()
        player_count = await _rebuild_players(conn)
        after = (await conn.execute(select(T.players))).fetchall()
        meta = (await _get_sync_meta(conn, "last")) or {}
        meta = {
            **meta,
            "players": player_count,
            "deduped_at": datetime.now(timezone.utc).isoformat(),
            "dedupe_challonge_api_calls": 0,
        }
        await _set_sync_meta(conn, "last", meta)
    await engine.dispose()
    return {
        "status": "ok",
        "players_before": len(before),
        "players_after": len(after),
        "challonge_api_calls": 0,
    }


async def run_sync(
    force: bool = False,
    only_tournament: Optional[int] = None,
    replace: bool = False,
) -> Dict[str, Any]:
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
        if replace:
            if only_tournament:
                raise ValueError("--replace cannot be combined with --tournament")
            await _clear_public_cache(conn)
            seen = {}
        else:
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
            "replace": replace,
            "challonge_subdomain": os.environ.get("CHALLONGE_SUBDOMAIN") or None,
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
    parser.add_argument("--replace", action="store_true",
                        help="Delete old public cache rows before syncing returned tournaments.")
    parser.add_argument("--dedupe-only", action="store_true",
                        help="Canonicalize cached player names and rebuild aggregates without API calls.")
    parser.add_argument("--tournament", type=int,
                        help="Refresh a single tournament by Challonge id.")
    args = parser.parse_args()
    try:
        if args.dedupe_only:
            result = asyncio.run(run_dedupe_only())
        else:
            result = asyncio.run(run_sync(
                force=args.force,
                only_tournament=args.tournament,
                replace=args.replace,
            ))
        print(result)
        return 0
    except Exception as e:
        log.exception(f"Sync failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
