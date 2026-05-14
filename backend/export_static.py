"""Export the public stats API surface to a static JSON cache.

This is the shared-hosting deploy path: run Challonge sync locally or from a
short-lived shell job, export this cache, then build/upload the React app.
"""
import argparse
import asyncio
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from sqlalchemy import func, select

import database as T
from database import make_engine
from player_overrides import apply_player_overrides, load_player_overrides
from players_extras import (
    compute_elo_ratings,
    compute_perf_vs_fargo,
    compute_streaks,
    compute_tourney_championships,
    rolling_match_form,
    wins_over_time,
)

ROOT_DIR = Path(__file__).parent
PROJECT_ROOT = ROOT_DIR.parent
DEFAULT_OUT = PROJECT_ROOT / "frontend" / "public" / "data" / "cache.json"
DEFAULT_PRIZE_OVERRIDES = ROOT_DIR / "prize_overrides.json"
MAX_NORMAL_TOURNAMENT_DURATION_MINUTES = 12 * 60
DEFAULT_RANKING_MIN_MATCHES = 10
ENTRY_FEE_DOLLARS = 10
DEFAULT_SEASON_POINTS = {
    "win_points": 3,
    "loss_points": 1,
    "title_bonus": 0,
    "attendance_bonus": 0,
}


def _row_to_dict(row) -> Dict[str, Any]:
    return dict(row._mapping)


def _json_default(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _load_season_points(path: Path | None = None) -> Dict[str, int]:
    config_path = path or (ROOT_DIR / "season_points.json")
    values = dict(DEFAULT_SEASON_POINTS)
    if config_path.exists():
        raw = json.loads(config_path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            raise ValueError("season points config must be a JSON object")
        for key in values:
            if key in raw:
                values[key] = int(raw[key])
    return values


def _load_prize_overrides(path: Path | None = None) -> Dict[str, Any]:
    config_path = path or DEFAULT_PRIZE_OVERRIDES
    if not config_path.exists():
        return {"default_entry_fee": ENTRY_FEE_DOLLARS, "tournaments": {}}
    raw = json.loads(config_path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("prize overrides must be a JSON object")
    return {
        "default_entry_fee": int(raw.get("default_entry_fee") or ENTRY_FEE_DOLLARS),
        "tournaments": raw.get("tournaments") or {},
    }


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


def _normalized_duration_minutes(minutes: Optional[int]) -> Optional[int]:
    if minutes is None or minutes > MAX_NORMAL_TOURNAMENT_DURATION_MINUTES:
        return None
    return minutes


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


def _duration_baselines(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    usable = [
        row for row in rows
        if isinstance(row.get("duration_minutes"), int)
        and row.get("duration_minutes") >= 0
        and _normalized_duration_minutes(row.get("duration_minutes")) is not None
    ]
    groups: Dict[tuple[str, int], List[Dict[str, Any]]] = {}
    for row in usable:
        game = row.get("game") or "Unknown"
        player_count = int(row.get("player_count") or 0)
        groups.setdefault((game, player_count), []).append(row)

    def trimmed_rows(group_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if len(group_rows) < 4:
            return group_rows
        values = sorted(row["duration_minutes"] for row in group_rows)
        midpoint = len(values) // 2
        median = (
            values[midpoint]
            if len(values) % 2
            else (values[midpoint - 1] + values[midpoint]) / 2
        )
        low = max(45, median * 0.4)
        high = min(MAX_NORMAL_TOURNAMENT_DURATION_MINUTES, median * 1.8)
        filtered = [row for row in group_rows if low <= row["duration_minutes"] <= high]
        return filtered or group_rows

    def summarize(group_rows: List[Dict[str, Any]], include_group: bool = False) -> Dict[str, Any]:
        baseline_rows = trimmed_rows(group_rows)
        ordered = sorted(baseline_rows, key=lambda row: (row["duration_minutes"], row.get("date") or ""))
        shortest = ordered[0]
        longest = ordered[-1]
        avg = round(sum(row["duration_minutes"] for row in ordered) / len(ordered))
        out = {
            "sample_count": len(ordered),
            "excluded_outlier_count": len(group_rows) - len(ordered),
            "average_minutes": avg,
            "average_label": _format_duration(avg),
            "shortest": {
                "tournament_id": shortest.get("tournament_id"),
                "tournament_name": shortest.get("tournament_name"),
                "date": shortest.get("date"),
                "duration_minutes": shortest["duration_minutes"],
                "duration_label": _format_duration(shortest["duration_minutes"]),
            },
            "longest": {
                "tournament_id": longest.get("tournament_id"),
                "tournament_name": longest.get("tournament_name"),
                "date": longest.get("date"),
                "duration_minutes": longest["duration_minutes"],
                "duration_label": _format_duration(longest["duration_minutes"]),
            },
        }
        if include_group:
            out["game"] = group_rows[0].get("game") or "Unknown"
            out["player_count"] = int(group_rows[0].get("player_count") or 0)
        return out

    by_key = {
        f"{game}|{player_count}": summarize(group_rows, include_group=True)
        for (game, player_count), group_rows in groups.items()
    }
    group_rows = sorted(
        by_key.values(),
        key=lambda row: (-row["sample_count"], row["game"].casefold(), row["player_count"]),
    )
    return {
        "overall": summarize(usable) if usable else None,
        "by_game_and_player_count": group_rows,
        "by_key": by_key,
    }


def _round_to_nearest_five(value: float) -> int:
    return int(math.floor((value / 5) + 0.5) * 5)


def _tournament_prize_payouts(
    player_count: int,
    placements: Dict[str, int],
    entry_fee: int = ENTRY_FEE_DOLLARS,
    override: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    override = override or {}
    entry_fee = int(override.get("entry_fee") or entry_fee)
    pot = int(override.get("pot") or max(0, int(player_count or 0) * entry_fee))
    place_targets = {
        1: pot * 0.5,
        2: pot * 0.5 * 0.6,
        3: pot * 0.5 * 0.3,
        4: pot * 0.5 * 0.1,
    }
    place_payouts = {place: _round_to_nearest_five(amount) for place, amount in place_targets.items()}
    manual_payouts = override.get("payouts") or {}
    for place, amount in manual_payouts.items():
        place_payouts[int(place)] = int(amount)
    delta = pot - sum(place_payouts.values())
    if delta:
        reconcile_place = next(
            (place for place in (4, 3, 2, 1) if place_payouts.get(place, 0) + delta >= 0),
            1,
        )
        place_payouts[reconcile_place] += delta

    payout_rows = []
    for place in (1, 2, 3, 4):
        players = sorted(
            [player for player, player_place in placements.items() if player_place == place],
            key=str.casefold,
        )
        if not players:
            continue
        place_total = place_payouts[place]
        per_player = _round_to_nearest_five(place_total / len(players)) if players else 0
        payout_rows.append({
            "place": place,
            "players": players,
            "amount": place_total,
            "per_player": per_player,
            "split": len(players) > 1,
        })

    awarded = sum(row["amount"] for row in payout_rows)
    unassigned = pot - awarded
    if unassigned and payout_rows:
        payout_rows[-1]["amount"] += unassigned
        payout_rows[-1]["per_player"] = (
            _round_to_nearest_five(payout_rows[-1]["amount"] / len(payout_rows[-1]["players"]))
            if payout_rows[-1]["players"]
            else 0
        )
        awarded = pot

    return {
        "entry_fee": entry_fee,
        "player_count": player_count,
        "pot": pot,
        "payouts": payout_rows,
        "awarded": awarded,
        "unassigned": pot - awarded,
        "source": "override" if override else "calculated",
        "rules": (
            override.get("note")
            or f"Entry is ${entry_fee} per player. First gets half the pot; the remaining half is split 60/30/10 for second, third, and fourth. Payouts are rounded to the nearest $5 and reconciled to award the full pot."
        ),
    }


def _match_elo_odds(match: Dict[str, Any], elo: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    winner = match.get("winner_name")
    loser = match.get("loser_name")
    if not winner or not loser:
        return None
    winner_rating = elo["ratings"].get(winner, elo["initial_rating"])
    loser_rating = elo["ratings"].get(loser, elo["initial_rating"])
    winner_probability = 1.0 / (1.0 + math.pow(10, (loser_rating - winner_rating) / 400.0))
    loser_probability = 1 - winner_probability
    return {
        "winner_rating": winner_rating,
        "loser_rating": loser_rating,
        "winner_probability": round(winner_probability * 100, 1),
        "loser_probability": round(loser_probability * 100, 1),
        "rating_gap": winner_rating - loser_rating,
        "favorite": winner if winner_probability >= loser_probability else loser,
        "basis": "ELO",
    }


def _cinderella_runs(matches: List[Dict[str, Any]], limit: int = 3) -> List[Dict[str, Any]]:
    runs: Dict[str, Dict[str, Any]] = {}
    for match in matches:
        winner = match.get("winner_name")
        loser = match.get("loser_name")
        odds = match.get("elo_odds") or {}
        if not winner or not loser or odds.get("favorite") == winner:
            continue
        winner_probability = odds.get("winner_probability")
        favorite_probability = odds.get("loser_probability")
        if winner_probability is None or favorite_probability is None:
            continue
        row = runs.setdefault(winner, {
            "player": winner,
            "upset_count": 0,
            "upset_score": 0.0,
            "biggest_upset": None,
            "matches": [],
        })
        upset = {
            "match_id": match.get("id"),
            "round": match.get("round"),
            "opponent": loser,
            "scores": match.get("scores"),
            "winner_probability": winner_probability,
            "favorite_probability": favorite_probability,
            "rating_gap": abs(odds.get("rating_gap") or 0),
        }
        row["upset_count"] += 1
        row["upset_score"] = round(row["upset_score"] + favorite_probability, 1)
        row["matches"].append(upset)
        if not row["biggest_upset"] or favorite_probability > row["biggest_upset"]["favorite_probability"]:
            row["biggest_upset"] = upset

    out = []
    for row in runs.values():
        row["matches"].sort(key=lambda match: (match.get("round") or 0, str(match.get("match_id") or "")))
        out.append(row)
    out.sort(key=lambda row: (-row["upset_score"], -row["upset_count"], row["player"].casefold()))
    return out[:limit]


def _upset_tracker(matches: List[Dict[str, Any]], limit: int = 10) -> List[Dict[str, Any]]:
    rows = []
    for match in matches:
        winner = match.get("winner_name")
        loser = match.get("loser_name")
        odds = match.get("elo_odds") or {}
        if not winner or not loser or odds.get("favorite") == winner:
            continue
        winner_probability = odds.get("winner_probability")
        favorite_probability = odds.get("loser_probability")
        if winner_probability is None or favorite_probability is None:
            continue
        rows.append({
            "match_id": match.get("id"),
            "tournament_id": match.get("tournament_id"),
            "tournament_name": match.get("tournament_name"),
            "date": match.get("completed_at"),
            "winner": winner,
            "loser": loser,
            "scores": match.get("scores"),
            "round": match.get("round"),
            "winner_probability": winner_probability,
            "favorite_probability": favorite_probability,
            "rating_gap": abs(odds.get("rating_gap") or 0),
        })
    rows.sort(key=lambda row: (-row["favorite_probability"], -row["rating_gap"], str(row.get("date") or "")))
    return rows[:limit]


def _anniversary_matches(matches: List[Dict[str, Any]], window_days: int = 21, limit: int = 8) -> Dict[str, Any]:
    completed = []
    for match in matches:
        if match.get("state") != "complete" or not match.get("winner_name") or not match.get("loser_name"):
            continue
        completed_at = _parse_dt(match.get("completed_at"))
        if completed_at:
            completed.append((match, completed_at))
    if not completed:
        return {"mode": "empty", "target_date": None, "window_days": window_days, "matches": []}

    latest = max(dt for _, dt in completed)
    try:
        target = latest.replace(year=latest.year - 1)
    except ValueError:
        target = latest - timedelta(days=365)

    rows = []
    for match, completed_at in completed:
        days_from_target = abs((completed_at.date() - target.date()).days)
        if days_from_target <= window_days:
            rows.append(_anniversary_match_row(match, completed_at, days_from_target))
    mode = "anniversary"

    if not rows:
        current_season = _season_for_date(latest.isoformat())
        previous = [
            (match, completed_at)
            for match, completed_at in completed
            if _season_for_date(completed_at.isoformat())
            and current_season
            and _season_for_date(completed_at.isoformat())["sort"] < current_season["sort"]
        ]
        previous.sort(key=lambda item: item[1], reverse=True)
        rows = [
            _anniversary_match_row(match, completed_at, None)
            for match, completed_at in previous[:limit]
        ]
        mode = "previous_season"
    else:
        rows.sort(key=lambda row: (row["days_from_target"], row["date"] or ""))
        rows = rows[:limit]

    return {
        "mode": mode,
        "target_date": target.date().isoformat(),
        "window_days": window_days,
        "matches": rows,
    }


def _anniversary_match_row(match: Dict[str, Any], completed_at: datetime, days_from_target: Optional[int]) -> Dict[str, Any]:
    return {
        "match_id": match.get("id"),
        "tournament_id": match.get("tournament_id"),
        "tournament_name": match.get("tournament_name"),
        "date": completed_at.isoformat(),
        "days_from_target": days_from_target,
        "winner": match.get("winner_name"),
        "loser": match.get("loser_name"),
        "scores": match.get("scores"),
        "game": match.get("tournament_game"),
    }


def _tournament_difficulty(matches: List[Dict[str, Any]], elo: Dict[str, Any]) -> Dict[str, Any]:
    players = sorted({
        name
        for match in matches
        for name in (match.get("winner_name"), match.get("loser_name"))
        if name
    }, key=str.casefold)
    if not players:
        return {"label": "Unknown", "average_elo": None, "top_elo": None, "field_size": 0}

    ratings = [elo["ratings"].get(player, elo["initial_rating"]) for player in players]
    average = round(sum(ratings) / len(ratings))
    top = max(ratings)
    if average >= 1580 or top >= 1750:
        label = "Elite"
    elif average >= 1530 or top >= 1650:
        label = "Strong"
    elif average >= 1480:
        label = "Standard"
    else:
        label = "Open"
    return {
        "label": label,
        "average_elo": average,
        "top_elo": top,
        "field_size": len(players),
    }


def _is_qualified_player(player: Dict[str, Any], minimum_matches: int = DEFAULT_RANKING_MIN_MATCHES) -> bool:
    return ((player.get("wins") or 0) + (player.get("losses") or 0)) >= minimum_matches


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


def _strength_of_schedule(
    matches: List[Dict[str, Any]],
    player_name: str,
    players_by_name: Dict[str, Dict[str, Any]],
    elo: Dict[str, Any],
) -> Dict[str, Any]:
    opponent_win_rates = []
    opponent_elos = []
    opponents = set()
    for match in matches:
        winner = match.get("winner_name")
        loser = match.get("loser_name")
        if winner == player_name:
            opponent = loser
        elif loser == player_name:
            opponent = winner
        else:
            continue
        if not opponent:
            continue
        opponents.add(opponent)
        opponent_row = players_by_name.get(opponent, {})
        if opponent_row.get("win_rate") is not None:
            opponent_win_rates.append(float(opponent_row.get("win_rate") or 0))
        opponent_elos.append(elo["ratings"].get(opponent, elo["initial_rating"]))

    return {
        "match_count": len(opponent_elos),
        "opponent_count": len(opponents),
        "average_opponent_win_rate": (
            round(sum(opponent_win_rates) / len(opponent_win_rates), 1)
            if opponent_win_rates
            else None
        ),
        "average_opponent_elo": (
            round(sum(opponent_elos) / len(opponent_elos))
            if opponent_elos
            else None
        ),
    }


def _recent_activity_summary(matches: List[Dict[str, Any]], window: int = 30) -> Dict[str, Any]:
    completed = [
        m for m in matches
        if m.get("state") == "complete"
        and m.get("completed_at")
        and m.get("winner_name")
        and m.get("loser_name")
    ]
    parsed = [(m, _parse_dt(m.get("completed_at"))) for m in completed]
    parsed = [(m, dt) for m, dt in parsed if dt]
    if not parsed:
        return {
            "window_days": window,
            "active_players": 0,
            "match_count": 0,
            "hottest_player": None,
        }

    latest = max(dt for _, dt in parsed)
    cutoff = latest.timestamp() - (window * 24 * 60 * 60)
    recent = [m for m, dt in parsed if dt.timestamp() >= cutoff]
    if not recent:
        recent = [m for m, _ in sorted(parsed, key=lambda item: item[1])[-20:]]

    records: Dict[str, Dict[str, int]] = {}
    for match in recent:
        winner = match["winner_name"]
        loser = match["loser_name"]
        records.setdefault(winner, {"wins": 0, "losses": 0})["wins"] += 1
        records.setdefault(loser, {"wins": 0, "losses": 0})["losses"] += 1

    ranked = []
    for name, record in records.items():
        total = record["wins"] + record["losses"]
        if total < 2:
            continue
        ranked.append({
            "player": name,
            "wins": record["wins"],
            "losses": record["losses"],
            "matches": total,
            "win_rate": round((record["wins"] / total) * 100, 1),
        })
    ranked.sort(key=lambda row: (-row["win_rate"], -row["wins"], row["player"].casefold()))

    return {
        "window_days": window,
        "active_players": len(records),
        "match_count": len(recent),
        "hottest_player": ranked[0] if ranked else None,
    }


def _closest_rivalry(matches: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    pairs: Dict[tuple[str, str], Dict[str, Any]] = {}
    for match in matches:
        winner = match.get("winner_name")
        loser = match.get("loser_name")
        if match.get("state") != "complete" or not winner or not loser or winner == loser:
            continue
        left, right = sorted((winner, loser), key=str.casefold)
        key = (left, right)
        row = pairs.setdefault(key, {"player_a": left, "player_b": right, "a_wins": 0, "b_wins": 0})
        if winner == left:
            row["a_wins"] += 1
        else:
            row["b_wins"] += 1

    rivalries = []
    for row in pairs.values():
        total = row["a_wins"] + row["b_wins"]
        if total < 3:
            continue
        diff = abs(row["a_wins"] - row["b_wins"])
        rivalries.append({
            **row,
            "matches": total,
            "difference": diff,
            "label": f"{row['player_a']} vs {row['player_b']}",
        })
    if not rivalries:
        return None
    return sorted(rivalries, key=lambda row: (row["difference"], -row["matches"], row["label"].casefold()))[0]


def _rivalry_index(matches: List[Dict[str, Any]], limit: int = 20) -> List[Dict[str, Any]]:
    pairs: Dict[tuple[str, str], Dict[str, Any]] = {}
    for match in matches:
        winner = match.get("winner_name")
        loser = match.get("loser_name")
        if match.get("state") != "complete" or not winner or not loser or winner == loser:
            continue
        left, right = sorted((winner, loser), key=str.casefold)
        row = pairs.setdefault(
            (left, right),
            {
                "player_a": left,
                "player_b": right,
                "a_wins": 0,
                "b_wins": 0,
                "outcomes": [],
            },
        )
        winner_key = "a" if winner == left else "b"
        row[f"{winner_key}_wins"] += 1
        row["outcomes"].append({
            "winner_key": winner_key,
            "completed_at": match.get("completed_at") or "",
            "id": str(match.get("id") or ""),
        })

    rows = []
    for row in pairs.values():
        total = row["a_wins"] + row["b_wins"]
        if total < 3:
            continue
        ordered = sorted(row["outcomes"], key=lambda item: (item["completed_at"], item["id"]))
        streak_swings = 0
        current_key = None
        current_streak = 0
        longest_streak = 0
        for outcome in ordered:
            winner_key = outcome["winner_key"]
            if winner_key != current_key:
                if current_key is not None:
                    streak_swings += 1
                current_key = winner_key
                current_streak = 1
            else:
                current_streak += 1
            longest_streak = max(longest_streak, current_streak)

        difference = abs(row["a_wins"] - row["b_wins"])
        closeness = round(1 - (difference / total), 3)
        score = round((total * 2) + (closeness * 10) + (streak_swings * 3), 1)
        rows.append({
            "player_a": row["player_a"],
            "player_b": row["player_b"],
            "label": f"{row['player_a']} vs {row['player_b']}",
            "a_wins": row["a_wins"],
            "b_wins": row["b_wins"],
            "matches": total,
            "difference": difference,
            "closeness": closeness,
            "streak_swings": streak_swings,
            "longest_streak": longest_streak,
            "score": score,
        })

    return sorted(
        rows,
        key=lambda row: (-row["score"], -row["matches"], row["difference"], row["label"].casefold()),
    )[:limit]


def _attendance_stats(tournaments: List[Dict[str, Any]], matches: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    ordered_tournaments = sorted(
        tournaments,
        key=lambda t: (t.get("started_at") or t.get("completed_at") or "", str(t.get("id") or "")),
    )
    participants_by_tournament: Dict[Any, set[str]] = {}
    for match in matches:
        tid = match.get("tournament_id")
        if tid is None:
            continue
        names = [match.get("winner_name"), match.get("loser_name")]
        for name in names:
            if name:
                participants_by_tournament.setdefault(tid, set()).add(name)

    all_players = sorted({
        name
        for participants in participants_by_tournament.values()
        for name in participants
    }, key=str.casefold)
    stats: Dict[str, Dict[str, Any]] = {}
    for player_name in all_players:
        played = []
        current = 0
        best = 0
        running = 0
        for tournament in ordered_tournaments:
            participated = player_name in participants_by_tournament.get(tournament.get("id"), set())
            if participated:
                running += 1
                best = max(best, running)
                played.append({
                    "tournament_id": tournament.get("id"),
                    "tournament_name": tournament.get("name"),
                    "date": tournament.get("started_at") or tournament.get("completed_at"),
                })
            else:
                running = 0
        for tournament in reversed(ordered_tournaments):
            if player_name in participants_by_tournament.get(tournament.get("id"), set()):
                current += 1
            else:
                break
        stats[player_name] = {
            "tournaments_played": len(played),
            "current_streak": current,
            "best_streak": best,
            "last_played_at": played[-1]["date"] if played else None,
            "recent_tournaments": played[-5:],
        }
    return stats


def _season_for_date(value: Optional[str]) -> Optional[Dict[str, Any]]:
    date = _parse_dt(value)
    if not date:
        return None
    if date.month in (3, 4, 5):
        name = "Spring"
        order = 2
    elif date.month in (6, 7, 8):
        name = "Summer"
        order = 3
    elif date.month in (9, 10, 11):
        name = "Fall"
        order = 4
    else:
        name = "Winter"
        order = 1
    return {
        "key": f"{date.year}-{order}",
        "label": f"{date.year} {name}",
        "sort": date.year * 10 + order,
    }


def _season_standings(
    tournaments: List[Dict[str, Any]],
    matches: List[Dict[str, Any]],
    points_config: Optional[Dict[str, int]] = None,
) -> List[Dict[str, Any]]:
    scoring = points_config or DEFAULT_SEASON_POINTS
    tournament_dates = {
        tournament.get("id"): tournament.get("started_at") or tournament.get("completed_at")
        for tournament in tournaments
    }
    seasons: Dict[str, Dict[str, Any]] = {}
    for match in matches:
        winner = match.get("winner_name")
        loser = match.get("loser_name")
        if match.get("state") != "complete" or not winner or not loser:
            continue

        match_date = tournament_dates.get(match.get("tournament_id")) or match.get("completed_at")
        season = _season_for_date(match_date)
        if not season:
            continue

        bucket = seasons.setdefault(
            season["key"],
            {
                "season": season["label"],
                "season_key": season["key"],
                "sort": season["sort"],
                "matches": 0,
                "tournament_ids": set(),
                "players": {},
            },
        )
        bucket["matches"] += 1
        if match.get("tournament_id") is not None:
            bucket["tournament_ids"].add(match.get("tournament_id"))

        for player_name, result in ((winner, "wins"), (loser, "losses")):
            row = bucket["players"].setdefault(
                player_name,
                {"player": player_name, "wins": 0, "losses": 0, "tournament_ids": set()},
            )
            row[result] += 1
            if match.get("tournament_id") is not None:
                row["tournament_ids"].add(match.get("tournament_id"))

    rows = []
    for bucket in seasons.values():
        players = []
        for player in bucket["players"].values():
            total = player["wins"] + player["losses"]
            tournament_ids = player.pop("tournament_ids", set())
            players.append({
                **player,
                "matches": total,
                "attendance": len(tournament_ids),
                "win_rate": round((player["wins"] / total) * 100, 1) if total else 0.0,
                "points": (
                    player["wins"] * scoring["win_points"]
                    + player["losses"] * scoring["loss_points"]
                ),
            })
        players.sort(key=lambda row: (-row["points"], -row["wins"], -row["win_rate"], row["losses"], row["player"].casefold()))
        rows.append({
            "season": bucket["season"],
            "season_key": bucket["season_key"],
            "points_config": scoring,
            "_sort": bucket["sort"],
            "matches": bucket["matches"],
            "tournaments": len(bucket["tournament_ids"]),
            "players": players,
            "attendance_leaders": sorted(
                players,
                key=lambda row: (-row["attendance"], -row["matches"], row["player"].casefold()),
            )[:10],
        })

    sorted_rows = sorted(rows, key=lambda row: row["_sort"], reverse=True)
    for row in sorted_rows:
        row.pop("_sort", None)
    return sorted_rows


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
        player_overrides = load_player_overrides()
        season_points = _load_season_points()
        prize_overrides = _load_prize_overrides()

        for p in players:
            apply_player_overrides(p, player_overrides)
            total = (p.get("wins") or 0) + (p.get("losses") or 0)
            p["win_rate"] = round(((p.get("wins") or 0) / total) * 100, 1) if total else 0.0

        tournaments_by_id = {str(t["id"]): t for t in tournaments}
        players_by_name = {p["name"]: p for p in players}
        elo = compute_elo_ratings(matches)
        attendance = _attendance_stats(tournaments, matches)

        for match in matches:
            tournament = tournaments_by_id.get(str(match.get("tournament_id")))
            match["tournament_game"] = (tournament or {}).get("game")
            match["elo_odds"] = _match_elo_odds(match, elo)

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
            "duration_extremes": None,
            "duration_groups": [],
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
        all_cash_winnings: Dict[str, Dict[str, Any]] = {}
        duration_values: List[int] = []
        duration_rows: List[Dict[str, Any]] = []
        duration_outlier_count = 0

        for tournament in tournaments:
            tid = tournament["id"]
            tournament_matches = sorted(
                matches_by_tournament.get(tid, []),
                key=lambda m: (m.get("round") is None, m.get("round") or 0),
            )
            duration_minutes = _duration_minutes(tournament.get("started_at"), tournament.get("completed_at"))
            duration_label = _format_duration(duration_minutes)
            normalized_duration = _normalized_duration_minutes(duration_minutes)
            placements = _infer_tournament_placements(tournament_matches)
            winner = next((name for name, place in placements.items() if place == 1), None)
            if winner:
                winner_counts[winner] = winner_counts.get(winner, 0) + 1
            for player_name, place in placements.items():
                all_placements.setdefault(player_name, {})[str(tid)] = place
            if normalized_duration is not None:
                duration_values.append(normalized_duration)
            elif duration_minutes is not None:
                duration_outlier_count += 1

            player_count = tournament.get("participants_count") or len({
                name
                for match in tournament_matches
                for name in (match.get("winner_name"), match.get("loser_name"))
                if name
            })
            difficulty = _tournament_difficulty(tournament_matches, elo)
            if normalized_duration is not None:
                duration_rows.append({
                    "tournament_id": tid,
                    "tournament_name": tournament.get("name"),
                    "date": tournament.get("started_at") or tournament.get("completed_at"),
                    "game": tournament.get("game"),
                    "player_count": player_count,
                    "duration_minutes": normalized_duration,
                })
            cinderella_runs = _cinderella_runs(tournament_matches)
            prize_pool = _tournament_prize_payouts(
                player_count,
                placements,
                prize_overrides["default_entry_fee"],
                prize_overrides["tournaments"].get(str(tid)),
            )
            for payout in prize_pool["payouts"]:
                players_in_place = payout.get("players") or []
                if not players_in_place:
                    continue
                player_amount = payout["amount"] / len(players_in_place)
                for player_name in players_in_place:
                    cash_row = all_cash_winnings.setdefault(player_name, {"total": 0.0, "by_tournament": []})
                    cash_row["total"] += player_amount
                    cash_row["by_tournament"].append({
                        "tournament_id": tid,
                        "tournament_name": tournament.get("name"),
                        "place": payout["place"],
                        "amount": player_amount,
                    })
            tournament["duration_minutes"] = duration_minutes
            tournament["duration_label"] = duration_label
            tournament["normalized_duration_minutes"] = normalized_duration
            tournament["normalized_duration_label"] = _format_duration(normalized_duration)
            tournament["duration_outlier"] = duration_minutes is not None and normalized_duration is None
            tournament["winner"] = winner
            tournament["player_count"] = player_count
            tournament["prize_pool"] = prize_pool["pot"]
            tournament["difficulty"] = difficulty
            tournament_details[str(tid)] = {
                "tournament": tournament,
                "matches": tournament_matches,
                "analytics": {
                    "player_count": player_count,
                    "entry_fee": prize_pool["entry_fee"],
                    "prize_pool": prize_pool["pot"],
                    "prize_payouts": prize_pool["payouts"],
                    "prize_awarded": prize_pool["awarded"],
                    "prize_unassigned": prize_pool["unassigned"],
                    "prize_rules": prize_pool["rules"],
                    "prize_source": prize_pool["source"],
                    "duration_minutes": duration_minutes,
                    "duration_label": duration_label,
                    "normalized_duration_minutes": normalized_duration,
                    "normalized_duration_label": _format_duration(normalized_duration),
                    "duration_outlier": tournament["duration_outlier"],
                    "winner": winner,
                    "difficulty": difficulty,
                    "cinderella_runs": cinderella_runs,
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
            if normalized_duration is not None:
                tournament_analytics["duration_trend"].append({
                    "tournament_id": tid,
                    "tournament_name": tournament.get("name"),
                    "date": tournament.get("started_at") or tournament.get("completed_at"),
                    "duration_minutes": normalized_duration,
                    "duration_label": _format_duration(normalized_duration),
                })

        tournament_analytics["player_count_trend"].sort(key=lambda row: row.get("date") or "")
        tournament_analytics["duration_trend"].sort(key=lambda row: row.get("date") or "")
        tournament_analytics["winner_leaderboard"] = _ranking_rows(winner_counts)
        tournament_analytics["total_with_duration"] = len(duration_values)
        tournament_analytics["duration_outlier_count"] = duration_outlier_count
        tournament_analytics["duration_outlier_threshold_minutes"] = MAX_NORMAL_TOURNAMENT_DURATION_MINUTES
        duration_baselines = _duration_baselines(duration_rows)
        tournament_analytics["duration_extremes"] = duration_baselines["overall"]
        tournament_analytics["duration_groups"] = duration_baselines["by_game_and_player_count"]
        for row in duration_rows:
            key = f"{row.get('game') or 'Unknown'}|{int(row.get('player_count') or 0)}"
            baseline = duration_baselines["by_key"].get(key)
            if not baseline:
                continue
            tid = row["tournament_id"]
            tournament = tournaments_by_id.get(str(tid))
            if tournament is not None:
                tournament["duration_baseline"] = baseline
            detail = tournament_details.get(str(tid))
            if detail is not None:
                detail["analytics"]["duration_baseline"] = baseline
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
            player_attendance = attendance.get(name, {
                "tournaments_played": 0,
                "current_streak": 0,
                "best_streak": 0,
                "last_played_at": None,
                "recent_tournaments": [],
            })
            player["tournaments_played"] = player_attendance["tournaments_played"]
            player["attendance_streak"] = player_attendance["current_streak"]
            player["best_attendance_streak"] = player_attendance["best_streak"]
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
                "second": sum(1 for place in placement_values if place == 2),
                "third": sum(1 for place in placement_values if place == 3),
                "fourth": sum(1 for place in placement_values if place == 4),
                "top_2": sum(1 for place in placement_values if place <= 2),
                "top_3": sum(1 for place in placement_values if place <= 3),
                "top_4": sum(1 for place in placement_values if place <= 4),
            }
            cash_winnings = all_cash_winnings.get(name, {"total": 0.0, "by_tournament": []})
            cash_total = round(cash_winnings["total"], 2)
            form_history = rolling_match_form(player_matches, name, 10)
            average_placement = round(sum(placement_values) / len(placement_values), 2) if placement_values else None
            player["average_placement"] = average_placement
            player["top_1_finishes"] = top_finishes["first"]
            player["second_place_finishes"] = top_finishes["second"]
            player["third_place_finishes"] = top_finishes["third"]
            player["fourth_place_finishes"] = top_finishes["fourth"]
            player["top_2_finishes"] = top_finishes["top_2"]
            player["top_3_finishes"] = top_finishes["top_3"]
            player["top_4_finishes"] = top_finishes["top_4"]
            player["placements_counted"] = len(placement_values)
            player["cash_won"] = cash_total
            strength_of_schedule = _strength_of_schedule(player_matches, name, players_by_name, elo)
            player["strength_of_schedule"] = strength_of_schedule["average_opponent_elo"]
            player["opponent_win_rate"] = strength_of_schedule["average_opponent_win_rate"]
            player["opponent_count"] = strength_of_schedule["opponent_count"]
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
                "form": {
                    "window": 10,
                    "history": form_history,
                    "latest": form_history[-1] if form_history else None,
                },
                "fargo": player.get("fargo"),
                "fargo_source": player.get("fargo_source"),
                "fargo_source_url": player.get("fargo_source_url"),
                "fargo_updated_at": player.get("fargo_updated_at"),
                "fargo_robustness": player.get("fargo_robustness"),
                "fargo_id": player.get("fargo_id"),
                "elo": {
                    "rating": player["elo_rating"],
                    "peak": player["elo_peak"],
                    "matches": player["elo_matches"],
                    "initial_rating": elo["initial_rating"],
                    "k_factor": elo["k_factor"],
                    "history": elo["history"].get(name, []),
                },
                "attendance": player_attendance,
                "placements": {
                    "average": average_placement,
                    "tournaments_counted": len(placement_values),
                    "by_tournament": placements_by_tournament,
                    "top_finishes": top_finishes,
                    "note": "Lower average placement is better. Missing placements are omitted.",
                },
                "cash": {
                    "total": cash_total,
                    "by_tournament": cash_winnings["by_tournament"],
                    "note": "Cash is estimated from $10 entries and rounded tournament payout rules.",
                },
                "strength_of_schedule": strength_of_schedule,
            }

        sync_status = last_sync or {"status": "never_synced"}
        recent_activity = _recent_activity_summary(matches)
        closest_rivalry = _closest_rivalry(matches)
        rivalry_index = _rivalry_index(matches)
        upset_tracker = _upset_tracker(matches)
        anniversary = _anniversary_matches(matches)
        season_standings = _season_standings(tournaments, matches, season_points)
        generated_at = datetime.now(timezone.utc).isoformat()
        stats = {
            "total_tournaments": len(tournaments),
            "total_matches": completed_match_count,
            "total_players": len(players),
            "cache_metadata": {
                "generated_at": generated_at,
                "last_synced_at": sync_status.get("last_synced_at"),
                "sync_status": sync_status.get("status"),
                "tournament_count": len(tournaments),
                "player_count": len(players),
                "match_count": completed_match_count,
            },
            "average_tournament_players": tournament_analytics["average_players"],
            "average_tournament_duration_minutes": tournament_analytics["average_duration_minutes"],
            "average_tournament_duration_label": tournament_analytics["average_duration_label"],
            "duration_outlier_count": duration_outlier_count,
            "duration_outlier_threshold_minutes": MAX_NORMAL_TOURNAMENT_DURATION_MINUTES,
            "tournament_duration_extremes": tournament_analytics["duration_extremes"],
            "tournament_duration_groups": tournament_analytics["duration_groups"][:8],
            "entry_fee": ENTRY_FEE_DOLLARS,
            "total_prize_pool": sum(t.get("prize_pool") or 0 for t in tournaments),
            "top_tournament_winners": tournament_analytics["winner_leaderboard"][:4],
            "ranking_min_matches": DEFAULT_RANKING_MIN_MATCHES,
            "qualified_player_count": len([player for player in players if _is_qualified_player(player)]),
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
            "season_standings": season_standings,
            "rivalry_index": rivalry_index,
            "upset_tracker": upset_tracker,
            "anniversary_matches": anniversary,
            "players": players,
            "recent_matches": [
                m for m in matches
                if m.get("winner_name") and m.get("loser_name")
            ][:10],
            "last_synced_at": sync_status.get("last_synced_at"),
            "dashboard_trends": {
                "latest_sync": sync_status.get("last_synced_at"),
                "active_players": recent_activity["active_players"],
                "activity_match_count": recent_activity["match_count"],
                "activity_window_days": recent_activity["window_days"],
                "hottest_player": recent_activity["hottest_player"],
                "closest_rivalry": closest_rivalry,
            },
        }

        return {
            "generated_at": generated_at,
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

    await write_cache(Path(args.out))


async def write_cache(out: Path = DEFAULT_OUT) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    cache = await build_cache()
    out.write_text(
        json.dumps(cache, default=_json_default, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Wrote static cache: {out} ({len(cache['players'])} players, {len(cache['tournaments'])} tournaments)")


if __name__ == "__main__":
    asyncio.run(main())
