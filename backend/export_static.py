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
    compute_elo_ratings,
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


def _parse_dt(value: Optional[str]):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _duration_minutes(started_at: Optional[str], completed_at: Optional[str]) -> Optional[int]:
    start = _parse_dt(started_at)
    end = _parse_dt(completed_at)
    if not start or not end or end < start:
        return None
    return round((end - start).total_seconds() / 60)


def _format_duration(minutes: Optional[int]) -> Optional[str]:
    if minutes is None:
        return None
    hours = minutes // 60
    mins = minutes % 60
    if hours and mins:
        return f"{hours}h {mins}m"
    if hours:
        return f"{hours}h"
    return f"{mins}m"


def _completed_matches(matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [
        m for m in matches
        if m.get("state") == "complete"
        and m.get("winner_name")
        and m.get("loser_name")
        and m.get("round") is not None
    ]


def _infer_tournament_placements(matches: List[Dict[str, Any]]) -> Dict[str, int]:
    completed = _completed_matches(matches)
    if not completed:
        return {}

    positive_rounds = [m for m in completed if (m.get("round") or 0) > 0]
    final_pool = positive_rounds or completed
    final = max(
        final_pool,
        key=lambda m: (
            m.get("round") or 0,
            m.get("completed_at") or "",
            str(m.get("id") or ""),
        ),
    )

    placements: Dict[str, int] = {
        final["winner_name"]: 1,
        final["loser_name"]: 2,
    }

    loser_bracket = sorted(
        [m for m in completed if (m.get("round") or 0) < 0],
        key=lambda m: (m.get("round") or 0, m.get("completed_at") or "", str(m.get("id") or "")),
    )
    next_place = 3
    for match in loser_bracket[:2]:
        loser = match.get("loser_name")
        if loser and loser not in placements:
            placements[loser] = next_place
            next_place += 1

    if next_place == 3 and positive_rounds:
        semifinal_round = (final.get("round") or 0) - 1
        semifinal_losers = sorted({
            m["loser_name"]
            for m in positive_rounds
            if m.get("round") == semifinal_round and m.get("loser_name") not in placements
        })
        for loser in semifinal_losers:
            placements[loser] = 3

    return placements


def _ranking_rows(counts: Dict[str, int], limit: int = 10) -> List[Dict[str, Any]]:
    rows = sorted(counts.items(), key=lambda item: (-item[1], item[0].casefold()))
    out: List[Dict[str, Any]] = []
    previous_count = None
    previous_rank = 0
    for index, (name, count) in enumerate(rows, start=1):
        rank = previous_rank if count == previous_count else index
        out.append({"rank": rank, "player": name, "wins": count, "count": count})
        previous_count = count
        previous_rank = rank
        if len(out) >= limit:
            break
    return out


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
        elo = compute_elo_ratings(matches)

        for match in matches:
            tournament = tournaments_by_id.get(str(match.get("tournament_id")))
            match["tournament_game"] = (tournament or {}).get("game")

        tournament_details = {}
        matches_by_tournament: Dict[Any, List[Dict[str, Any]]] = {}
        for match in matches:
            matches_by_tournament.setdefault(match.get("tournament_id"), []).append(match)

        tournament_analytics = {
            "average_players": None,
            "average_duration_minutes": None,
            "average_duration_label": None,
            "player_count_trend": [],
            "duration_trend": [],
            "winner_leaderboard": [],
            "total_with_duration": 0,
        }
        player_count_values = [
            t.get("participants_count") for t in tournaments
            if isinstance(t.get("participants_count"), int) and t.get("participants_count") > 0
        ]
        if player_count_values:
            tournament_analytics["average_players"] = round(sum(player_count_values) / len(player_count_values), 1)

        winner_counts: Dict[str, int] = {}
        all_placements: Dict[str, Dict[str, int]] = {}
        duration_values: List[int] = []

        for tournament in tournaments:
            tid = tournament["id"]
            tournament_matches = sorted(
                matches_by_tournament.get(tid, []),
                key=lambda m: (m.get("round") is None, m.get("round") or 0),
            )
            duration_minutes = _duration_minutes(tournament.get("started_at"), tournament.get("completed_at"))
            duration_label = _format_duration(duration_minutes)
            placements = _infer_tournament_placements(tournament_matches)
            winner = next((name for name, place in placements.items() if place == 1), None)
            if winner:
                winner_counts[winner] = winner_counts.get(winner, 0) + 1
            for player_name, place in placements.items():
                all_placements.setdefault(player_name, {})[str(tid)] = place
            if duration_minutes is not None:
                duration_values.append(duration_minutes)

            tournament["duration_minutes"] = duration_minutes
            tournament["duration_label"] = duration_label
            tournament_details[str(tid)] = {
                "tournament": tournament,
                "matches": tournament_matches,
                "analytics": {
                    "player_count": tournament.get("participants_count") or len({
                        name
                        for match in tournament_matches
                        for name in (match.get("winner_name"), match.get("loser_name"))
                        if name
                    }),
                    "duration_minutes": duration_minutes,
                    "duration_label": duration_label,
                    "winner": winner,
                    "placements": [
                        {"player": name, "place": place}
                        for name, place in sorted(placements.items(), key=lambda item: (item[1], item[0].casefold()))
                    ],
                },
            }

            if tournament.get("started_at") or tournament.get("completed_at"):
                tournament_analytics["player_count_trend"].append({
                    "tournament_id": tid,
                    "tournament_name": tournament.get("name"),
                    "date": tournament.get("started_at") or tournament.get("completed_at"),
                    "players": tournament.get("participants_count"),
                })
            if duration_minutes is not None:
                tournament_analytics["duration_trend"].append({
                    "tournament_id": tid,
                    "tournament_name": tournament.get("name"),
                    "date": tournament.get("started_at") or tournament.get("completed_at"),
                    "duration_minutes": duration_minutes,
                    "duration_label": duration_label,
                })

        tournament_analytics["player_count_trend"].sort(key=lambda row: row.get("date") or "")
        tournament_analytics["duration_trend"].sort(key=lambda row: row.get("date") or "")
        tournament_analytics["winner_leaderboard"] = _ranking_rows(winner_counts)
        tournament_analytics["total_with_duration"] = len(duration_values)
        if duration_values:
            avg_duration = round(sum(duration_values) / len(duration_values))
            tournament_analytics["average_duration_minutes"] = avg_duration
            tournament_analytics["average_duration_label"] = _format_duration(avg_duration)

        player_details = {}
        player_extras = {}
        for player in players:
            name = player["name"]
            player["elo_rating"] = elo["ratings"].get(name, elo["initial_rating"])
            player["elo_peak"] = elo["peaks"].get(name, player["elo_rating"])
            player["elo_matches"] = len(elo["history"].get(name, []))
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

            placements_by_tournament = all_placements.get(name, {})
            placement_values = list(placements_by_tournament.values())
            top_finishes = {
                "first": sum(1 for place in placement_values if place == 1),
                "top_2": sum(1 for place in placement_values if place <= 2),
                "top_3": sum(1 for place in placement_values if place <= 3),
                "top_4": sum(1 for place in placement_values if place <= 4),
            }
            average_placement = round(sum(placement_values) / len(placement_values), 2) if placement_values else None
            player["average_placement"] = average_placement
            player["top_1_finishes"] = top_finishes["first"]
            player["top_2_finishes"] = top_finishes["top_2"]
            player["top_3_finishes"] = top_finishes["top_3"]
            player["top_4_finishes"] = top_finishes["top_4"]
            player["placements_counted"] = len(placement_values)
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
                "elo": {
                    "rating": player["elo_rating"],
                    "peak": player["elo_peak"],
                    "matches": player["elo_matches"],
                    "initial_rating": elo["initial_rating"],
                    "k_factor": elo["k_factor"],
                    "history": elo["history"].get(name, []),
                },
                "placements": {
                    "average": average_placement,
                    "tournaments_counted": len(placement_values),
                    "by_tournament": placements_by_tournament,
                    "top_finishes": top_finishes,
                    "note": "Lower average placement is better. Missing placements are omitted.",
                },
            }

        sync_status = last_sync or {"status": "never_synced"}
        stats = {
            "total_tournaments": len(tournaments),
            "total_matches": completed_match_count,
            "total_players": len(players),
            "average_tournament_players": tournament_analytics["average_players"],
            "average_tournament_duration_minutes": tournament_analytics["average_duration_minutes"],
            "average_tournament_duration_label": tournament_analytics["average_duration_label"],
            "top_tournament_winners": tournament_analytics["winner_leaderboard"][:4],
            "top_elo_players": sorted(
                [
                    {
                        "player": player["name"],
                        "rating": player["elo_rating"],
                        "peak": player["elo_peak"],
                        "matches": player["elo_matches"],
                    }
                    for player in players
                    if player.get("elo_matches")
                ],
                key=lambda row: (-row["rating"], row["player"].casefold()),
            )[:10],
            "elo": {
                "initial_rating": elo["initial_rating"],
                "k_factor": elo["k_factor"],
                "rated_match_count": elo["rated_match_count"],
            },
            "tournament_player_count_trend": tournament_analytics["player_count_trend"][-8:],
            "tournament_duration_trend": tournament_analytics["duration_trend"][-8:],
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
            "tournament_analytics": tournament_analytics,
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
