"""Import manually tracked side matches into the local static cache database."""
import argparse
import asyncio
import csv
import hashlib
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List

from dotenv import load_dotenv
from sqlalchemy import insert, select, update

import database as T
from database import make_engine
from sync_job import _norm, _rebuild_players

DEFAULT_SOURCE = Path(__file__).with_name("manual_side_matches.csv")
DEFAULT_TOURNAMENT_ID = -900001
DEFAULT_TOURNAMENT_NAME = "Manual side matches"


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _int_or_default(value: Any, default: int) -> int:
    raw = _clean(value)
    if not raw:
        return default
    return int(raw)


def _side_match_id(row: Dict[str, Any]) -> str:
    explicit = _clean(row.get("match_id") or row.get("id"))
    if explicit:
        return explicit if explicit.startswith("side:") else f"side:{explicit}"
    fingerprint = "|".join(
        _clean(row.get(key))
        for key in ("tournament_id", "completed_at", "winner_name", "loser_name", "scores", "round")
    )
    return f"side:{hashlib.sha1(fingerprint.encode('utf-8')).hexdigest()[:20]}"


def load_side_match_rows(path: Path) -> List[Dict[str, Any]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        rows = []
        for line_number, row in enumerate(reader, start=2):
            winner_name = _norm(row.get("winner_name") or row.get("winner"))
            loser_name = _norm(row.get("loser_name") or row.get("loser"))
            if not winner_name or not loser_name:
                raise ValueError(f"line {line_number}: winner_name and loser_name are required")
            tournament_id = _int_or_default(row.get("tournament_id"), DEFAULT_TOURNAMENT_ID)
            rows.append({
                "id": _side_match_id({**row, "tournament_id": tournament_id}),
                "tournament_id": tournament_id,
                "tournament_name": _clean(row.get("tournament_name")) or DEFAULT_TOURNAMENT_NAME,
                "round": _int_or_default(row.get("round"), 1),
                "state": _clean(row.get("state")) or "complete",
                "scores": _clean(row.get("scores")) or None,
                "winner_id": None,
                "loser_id": None,
                "winner_name": winner_name,
                "loser_name": loser_name,
                "completed_at": _clean(row.get("completed_at")) or None,
                "game": _clean(row.get("game")) or "Side Match",
            })
    return rows


def _tournament_docs(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    grouped: Dict[int, Dict[str, Any]] = {}
    players_by_tournament: Dict[int, set[str]] = {}
    for row in rows:
        tid = row["tournament_id"]
        grouped.setdefault(tid, {
            "id": tid,
            "name": row["tournament_name"],
            "game": row["game"],
            "state": "complete",
            "started_at": row["completed_at"],
            "completed_at": row["completed_at"],
            "participants_count": 0,
            "url": None,
            "challonge_updated_at": None,
        })
        players_by_tournament.setdefault(tid, set()).update([row["winner_name"], row["loser_name"]])
        doc = grouped[tid]
        completed_at = row.get("completed_at")
        if completed_at:
            doc["started_at"] = min(filter(None, [doc.get("started_at"), completed_at]))
            doc["completed_at"] = max(filter(None, [doc.get("completed_at"), completed_at]))
    for tid, players in players_by_tournament.items():
        grouped[tid]["participants_count"] = len(players)
    return list(grouped.values())


async def import_side_matches(path: Path, dry_run: bool = False) -> Dict[str, int]:
    rows = load_side_match_rows(path)
    tournaments = _tournament_docs(rows)
    if dry_run:
        return {"matches": len(rows), "tournaments": len(tournaments), "players": 0}

    load_dotenv()
    engine = make_engine(os.environ.get("DATABASE_URL"))
    async with engine.begin() as conn:
        await conn.run_sync(T.metadata.create_all)
        for tournament in tournaments:
            existing = (await conn.execute(
                select(T.tournaments.c.id).where(T.tournaments.c.id == tournament["id"])
            )).fetchone()
            if existing:
                await conn.execute(
                    update(T.tournaments)
                    .where(T.tournaments.c.id == tournament["id"])
                    .values(**tournament)
                )
            else:
                await conn.execute(insert(T.tournaments).values(**tournament))

        for row in rows:
            match_doc = {key: value for key, value in row.items() if key != "game"}
            existing = (await conn.execute(
                select(T.matches.c.id).where(T.matches.c.id == match_doc["id"])
            )).fetchone()
            if existing:
                await conn.execute(
                    update(T.matches).where(T.matches.c.id == match_doc["id"]).values(**match_doc)
                )
            else:
                await conn.execute(insert(T.matches).values(**match_doc))
        player_count = await _rebuild_players(conn)
    await engine.dispose()
    return {"matches": len(rows), "tournaments": len(tournaments), "players": player_count}


def main() -> None:
    parser = argparse.ArgumentParser(description="Import manual side matches from CSV into the local cache DB.")
    parser.add_argument("--source", default=str(DEFAULT_SOURCE), help="CSV path with side matches.")
    parser.add_argument("--dry-run", action="store_true", help="Parse and report without writing to the database.")
    args = parser.parse_args()

    source = Path(args.source)
    if not source.exists():
        raise SystemExit(f"side match source not found: {source}")
    result = asyncio.run(import_side_matches(source, args.dry_run))
    mode = "validated" if args.dry_run else "imported"
    print(f"{mode} {result['matches']} side matches across {result['tournaments']} tournament bucket(s)")


if __name__ == "__main__":
    main()
