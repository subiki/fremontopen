"""Extra player analytics: cross-tournament streaks, tourney championships by game type, performance vs Fargo."""
import math
from typing import Dict, List, Any, Optional


def _expected_win_rate(rating_a: int, rating_b: int) -> float:
    """Standard logistic expected-win for ELO-style ratings.
    Fargo is a 200-point scale around 500; using the elo 400-spread approximation is close enough for demo.
    """
    return 1.0 / (1.0 + math.pow(10, (rating_b - rating_a) / 200.0))


def compute_streaks(matches: List[Dict[str, Any]], player_name: str) -> Dict[str, Any]:
    """Cross-tournament streaks. Matches must come with completed_at sortable.
    Returns {current_streak: {type:'W'|'L'|None, length:int}, longest_W, longest_L}.
    """
    sorted_m = sorted(
        [m for m in matches if m.get("completed_at")],
        key=lambda m: m["completed_at"],
    )
    longest_w = 0
    longest_l = 0
    cur_w = 0
    cur_l = 0
    for m in sorted_m:
        if m["winner_name"] == player_name:
            cur_w += 1
            cur_l = 0
            longest_w = max(longest_w, cur_w)
        elif m["loser_name"] == player_name:
            cur_l += 1
            cur_w = 0
            longest_l = max(longest_l, cur_l)
    # current = the last run
    if not sorted_m:
        cur_type, cur_len = None, 0
    else:
        last = sorted_m[-1]
        if last["winner_name"] == player_name:
            cur_type, cur_len = "W", cur_w
        else:
            cur_type, cur_len = "L", cur_l
    return {
        "current": {"type": cur_type, "length": cur_len},
        "longest_w": longest_w,
        "longest_l": longest_l,
    }


def compute_tourney_championships(tournaments: List[Dict[str, Any]], matches: List[Dict[str, Any]], player_name: str) -> Dict[str, Any]:
    """A tournament championship = the player won the highest-round (or "final") match.
    Heuristic: pick the match in each tournament with the largest `round` value; if winner is the player, they won the tournament.
    Group by tournament.game (categorize as 8-ball / 9-ball / other).
    """
    by_game: Dict[str, int] = {}
    titles: List[Dict[str, Any]] = []
    t_by_id = {t["id"]: t for t in tournaments}
    matches_by_t: Dict[int, List[Dict[str, Any]]] = {}
    for m in matches:
        if m.get("round") is None or m.get("state") != "complete":
            continue
        matches_by_t.setdefault(m["tournament_id"], []).append(m)

    for t_id, ms in matches_by_t.items():
        final = max(ms, key=lambda x: x.get("round") or 0)
        if final.get("winner_name") == player_name:
            t = t_by_id.get(t_id, {})
            game_raw = (t.get("game") or "other").lower()
            if "9" in game_raw:
                bucket = "9-ball"
            elif "8" in game_raw:
                bucket = "8-ball"
            elif game_raw in ("single elimination", "double elimination", "other"):
                bucket = "other"
            else:
                bucket = game_raw
            by_game[bucket] = by_game.get(bucket, 0) + 1
            titles.append({
                "tournament_id": t_id,
                "tournament_name": t.get("name"),
                "game": t.get("game"),
                "completed_at": t.get("completed_at"),
            })
    return {"by_game": by_game, "total": sum(by_game.values()), "titles": titles}


def compute_perf_vs_fargo(matches: List[Dict[str, Any]], player_name: str, player_fargo: Optional[int], all_fargos: Dict[str, int]) -> Dict[str, Any]:
    """For each completed match where BOTH players have a Fargo rating,
    compute expected win probability and compare to actual.
    Returns aggregate performance_score (sum of actual - expected) and per_match list.
    """
    if not player_fargo:
        return {"has_fargo": False, "performance_score": None, "rated_matches": 0, "per_match": []}
    per_match = []
    total_delta = 0.0
    rated = 0
    for m in matches:
        if not m.get("winner_name") or not m.get("loser_name"):
            continue
        opp = m["loser_name"] if m["winner_name"] == player_name else m["winner_name"]
        opp_fargo = all_fargos.get(opp)
        if not opp_fargo:
            continue
        won = m["winner_name"] == player_name
        expected = _expected_win_rate(player_fargo, opp_fargo)
        actual = 1.0 if won else 0.0
        delta = actual - expected
        total_delta += delta
        rated += 1
        per_match.append({
            "match_id": m.get("id"),
            "opponent": opp,
            "opponent_fargo": opp_fargo,
            "won": won,
            "expected_win_rate": round(expected, 3),
            "delta": round(delta, 3),
        })
    label = "on rating"
    if rated:
        avg = total_delta / rated
        if avg > 0.10:
            label = "above rating"
        elif avg < -0.10:
            label = "below rating"
    return {
        "has_fargo": True,
        "fargo": player_fargo,
        "performance_score": round(total_delta, 2),
        "rated_matches": rated,
        "label": label,
        "per_match": per_match,
    }


def wins_over_time(matches: List[Dict[str, Any]], player_name: str) -> List[Dict[str, Any]]:
    """Cumulative wins per completed match timestamp."""
    sorted_m = sorted(
        [m for m in matches if m.get("completed_at")],
        key=lambda m: m["completed_at"],
    )
    cum_w, cum_l = 0, 0
    out = []
    for m in sorted_m:
        if m["winner_name"] == player_name:
            cum_w += 1
        elif m["loser_name"] == player_name:
            cum_l += 1
        out.append({
            "date": m["completed_at"],
            "wins": cum_w,
            "losses": cum_l,
        })
    return out
