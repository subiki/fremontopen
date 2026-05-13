"""Export the public stats API surface to a static JSON cache.

This is the shared-hosting deploy path: run Challonge sync locally or from a
short-lived shell job, export this cache, then build/upload the React app.
"""
import argparse
import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from sqlalchemy import func, select

import database as T
from database import make_engine
from players_extras import (
    compute_perf_vs_fargo,
    compute_streaks,
    compute_tourney_championships,
    wins_over_time,
)

ROOT_DIR = Path(__file__).parent
PROJECT_ROOT = ROOT_DIR.parent
DEFAULT_OUT = PROJECT_ROOT / "frontend" / "public" / "data" / "cache.json"


def _row_to_dict(row) -> Dict[str, Any]:
    return dict(row._mapping)


def _json_default(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


async def _last_sync(conn) -> Optional[Dict[str, Any]]:
    row = (await conn.execute(
        select(T.sync_meta).where(T.sync_meta.c.key == "last")
    )).fetchone()
    return row.value if row else None


async def build_cache() -> Dict[str, Any]:
    load_dotenv(ROOT_DIR / ".env", override=True)
    engine = make_engine()
    try:
        async with engine.connect() as conn:
            tournament_rows = (await conn.execute(
                select(T.tournaments).order_by(T.tournaments.c.started_at.desc())
            )).fetchall()
            match_rows = (await conn.execute(
                select(T.matches).order_by(T.matches.c.completed_at.desc())
            )).fetchall()
            player_rows = (await conn.execute(
                select(T.players).order_by(T.players.c.wins.desc())
            )).fetchall()
            last_sync = await _last_sync(conn)
            completed_match_count = (await conn.execute(
                select(func.count()).select_from(T.matches)
                .where(T.matches.c.winner_name.isnot(None))
            )).scalar()

        tournaments = [_row_to_dict(r) for r in tournament_rows]
        matches = [_row_to_dict(r) for r in match_rows]
        players = [_row_to_dict(r) for r in player_rows]

        for p in players:
            total = (p.get("wins") or 0) + (p.get("losses") or 0)
            p["win_rate"] = round(((p.get("wins") or 0) / total) * 100, 1) if total else 0.0

        tournaments_by_id = {str(t["id"]): t for t in tournaments}
        players_by_name = {p["name"]: p for p in players}

        tournament_details = {}
        for tournament in tournaments:
            tid = tournament["id"]
            tournament_details[str(tid)] = {
                "tournament": tournament,
                "matches": sorted(
                    [m for m in matches if m.get("tournament_id") == tid],
                    key=lambda m: (m.get("round") is None, m.get("round") or 0),
                ),
            }

        player_details = {}
        player_extras = {}
        for player in players:
            name = player["name"]
            player_matches = [
                m for m in matches
                if m.get("winner_name") == name or m.get("loser_name") == name
            ]

            h2h: Dict[str, Dict[str, int]] = {}
            for match in player_matches:
                winner = match.get("winner_name")
                loser = match.get("loser_name")
                if not winner or not loser:
                    continue
                if winner == name:
                    opponent = loser
                    h2h.setdefault(opponent, {"wins": 0, "losses": 0})["wins"] += 1
                else:
                    opponent = winner
                    h2h.setdefault(opponent, {"wins": 0, "losses": 0})["losses"] += 1

            h2h_list = [
                {"opponent": opponent, "wins": record["wins"], "losses": record["losses"]}
                for opponent, record in h2h.items()
            ]
            h2h_list.sort(key=lambda row: row["wins"] + row["losses"], reverse=True)

            player_details[name] = {
                "player": player,
                "matches": player_matches,
                "head_to_head": h2h_list,
            }

            opponent_fargos = {
                opponent: players_by_name[opponent].get("fargo")
                for opponent in h2h.keys()
                if opponent in players_by_name and players_by_name[opponent].get("fargo")
            }
            player_extras[name] = {
                "streaks": compute_streaks(player_matches, name),
                "titles": compute_tourney_championships(tournaments, player_matches, name),
                "perf_vs_fargo": compute_perf_vs_fargo(
                    player_matches,
                    name,
                    player.get("fargo"),
                    opponent_fargos,
                ),
                "wins_over_time": wins_over_time(player_matches, name),
                "fargo": player.get("fargo"),
            }

        sync_status = last_sync or {"status": "never_synced"}
        stats = {
            "total_tournaments": len(tournaments),
            "total_matches": completed_match_count,
            "total_players": len(players),
            "players": players,
            "recent_matches": [
                m for m in matches
                if m.get("winner_name") and m.get("loser_name")
            ][:10],
            "last_synced_at": sync_status.get("last_synced_at"),
        }

        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "sync_status": sync_status,
            "stats": stats,
            "tournaments": tournaments,
            "tournament_details": tournament_details,
            "players": players,
            "player_details": player_details,
            "player_extras": player_extras,
            "matches": matches,
        }
    finally:
        await engine.dispose()


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Output JSON path")
    args = parser.parse_args()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    cache = await build_cache()
    out.write_text(
        json.dumps(cache, default=_json_default, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Wrote static cache: {out} ({len(cache['players'])} players, {len(cache['tournaments'])} tournaments)")


if __name__ == "__main__":
    asyncio.run(main())
